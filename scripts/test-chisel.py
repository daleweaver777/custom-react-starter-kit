#!/usr/bin/env python3
"""Run real installer and application checks for every Chisel feature selection.

Requires the checkout's installed Composer and npm dependencies. Applications are
created from a snapshot of the current working files, never the Git index alone.
All changes, databases, builds, and command logs stay in a private temp directory.
Successful application copies are removed; logs and failed copies are retained.
"""

import argparse
import base64
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import signal
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import xml.etree.ElementTree as ET


FEATURES = (
    "email-verification",
    "registration",
    "2fa",
    "passkeys",
    "password-confirmation",
)
SOURCE_AREAS = ("app", "bootstrap", "config", "database", "resources", "routes", "tests")
GENERATED = (
    "resources/js/actions",
    "resources/js/routes",
    "resources/js/wayfinder",
    "bootstrap/cache",
    "bootstrap/ssr",
    "public/build",
    "public/hot",
)
LOCKFILES = {"composer.lock", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"}
ROUTES = {
    "registration": ("register", "register.store"),
    "email-verification": ("verification.notice", "verification.verify", "verification.send"),
    "2fa": (
        "two-factor.login", "two-factor.login.store", "two-factor.enable",
        "two-factor.confirm", "two-factor.disable", "two-factor.qr-code",
        "two-factor.secret-key", "two-factor.recovery-codes", "two-factor.regenerate-recovery-codes",
    ),
    "passkeys": (
        "passkey.login-options", "passkey.login", "passkey.registration-options",
        "passkey.store", "passkey.destroy", "well-known.passkeys",
    ),
    "password-confirmation": ("password.confirm", "password.confirm.store", "password.confirmation"),
}
FEATURE_FILES = {
    "registration": (
        "app/Actions/Fortify/CreateNewUser.php", "resources/js/pages/auth/register.tsx",
        "tests/Feature/Auth/RegistrationTest.php",
    ),
    "email-verification": (
        "resources/js/pages/auth/verify-email.tsx", "tests/Feature/Auth/EmailVerificationTest.php",
        "tests/Feature/Auth/VerificationNotificationTest.php",
    ),
    "2fa": (
        "resources/js/pages/auth/two-factor-challenge.tsx", "resources/js/components/manage-two-factor.tsx",
        "resources/js/components/two-factor-setup-modal.tsx", "resources/js/components/two-factor-recovery-codes.tsx",
        "resources/js/components/ui/input-otp.tsx", "resources/js/hooks/use-two-factor-auth.ts",
        "resources/js/hooks/use-clipboard.ts", "resources/js/components/alert-error.tsx",
        "tests/Feature/Auth/TwoFactorChallengeTest.php",
        "database/migrations/2025_08_14_170933_add_two_factor_columns_to_users_table.php",
    ),
    "passkeys": (
        "resources/js/components/passkey-item.tsx", "resources/js/components/passkey-register.tsx",
        "resources/js/components/passkey-verify.tsx", "resources/js/components/manage-passkeys.tsx",
        "resources/js/components/ui/empty.tsx", "resources/js/components/ui/badge.tsx",
        "tests/Support/PasskeyAuthenticator.php",
        "database/migrations/2024_01_01_000000_create_passkeys_table.php",
    ),
    "password-confirmation": (
        "resources/js/pages/auth/confirm-password.tsx", "resources/js/components/password-confirmation-provider.tsx",
        "app/Http/Controllers/Auth/PasswordConfirmationController.php", "app/Http/Requests/Auth/ConfirmPasswordRequest.php",
        "app/Http/Middleware/ConfirmSensitiveAction.php", "tests/Feature/Auth/PasswordConfirmationTest.php",
    ),
}
REMOVED_MAINTAINER_FILES = (
    "AGENTS.md", "README-maintainer.md", "chisel.php", "chisel-paths.php",
    "app/Console/Commands/InstallFeaturesCommand.php", "tests/Unit/InstallerMigrationHookTest.php",
    "tests/Unit/ChiselFeatureCleanupTest.php", "scripts/test-chisel.py",
)
PROBE_PHP = r"""<?php
require $argv[1].'/vendor/autoload.php';
$app = require $argv[1].'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$app->make(Illuminate\Contracts\Http\Kernel::class);
$router = $app->make(Illuminate\Routing\Router::class);
$routes = [];
foreach ($router->getRoutes() as $route) {
    if ($route->getName()) {
        $routes[$route->getName()] = [
            'middleware' => $router->gatherRouteMiddleware($route),
            'action' => $route->getActionName(),
        ];
    }
}
echo json_encode([
    'routes' => $routes,
    'features' => config('fortify.features'),
    'password_confirmation' => (bool) config('fortify.password_confirmation'),
    'user_interfaces' => array_values(class_implements(App\Models\User::class)),
    'user_traits' => array_values(class_uses_recursive(App\Models\User::class)),
], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
"""


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def selected_features(mask):
    return [feature for bit, feature in enumerate(FEATURES) if mask & (1 << bit)]


def parse_masks(value):
    try:
        masks = sorted(set(int(item.strip()) for item in value.split(",")))
    except ValueError as error:
        raise argparse.ArgumentTypeError("Use comma-separated masks from 0 through 31.") from error
    if not masks or any(mask < 0 or mask > 31 for mask in masks):
        raise argparse.ArgumentTypeError("Masks must be from 0 through 31.")
    return masks


def clone_directory(source, destination):
    """Copy dependency trees independently, with APFS copy-on-write where available."""
    if sys.platform == "darwin":
        result = subprocess.run(["cp", "-cR", str(source), str(destination)], capture_output=True)
        if result.returncode == 0:
            return
        shutil.rmtree(destination, ignore_errors=True)
    shutil.copytree(source, destination, symlinks=True)


def snapshot_source(root, destination):
    listing = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=root,
    )
    digest = hashlib.sha256()
    count = 0
    for relative in sorted(set(os.fsdecode(item) for item in listing.split(b"\0") if item)):
        source = root / relative
        if not source.is_file() or relative in LOCKFILES or "__pycache__" in source.parts:
            continue
        if relative.startswith(("vendor/", "node_modules/", ".env")) and relative != ".env.example":
            continue
        if any(relative == prefix or relative.startswith(prefix + "/") for prefix in GENERATED):
            continue
        if source.suffix in (".sqlite", ".sqlite3", ".db"):
            continue
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        digest.update(relative.encode() + b"\0" + target.read_bytes())
        count += 1
    for relative in ("bootstrap/cache", "storage/framework/cache/data", "storage/framework/sessions", "storage/framework/views", "storage/logs"):
        (destination / relative).mkdir(parents=True, exist_ok=True)
    return {"files": count, "sha256": digest.hexdigest()}


def isolated_environment(temp_directory, node_installer, npm_cache):
    # Explicit allowlist avoids inheriting application/database/mail credentials.
    runtime_keys = {"PATH", "HOME", "USER", "LOGNAME", "SHELL", "LANG", "LC_ALL", "PHPRC", "PHP_INI_SCAN_DIR"}
    runtime_keys.update(key for key in os.environ if re.fullmatch(r"HERD_PHP_\d+_INI_SCAN_DIR", key))
    environment = {key: os.environ[key] for key in runtime_keys if key in os.environ}
    environment.update({
        "TMPDIR": str(temp_directory), "TMP": str(temp_directory), "TEMP": str(temp_directory),
        "CI": "1", "NO_COLOR": "1", "COMPOSER_DISABLE_NETWORK": "1",
        "COMPOSER_NO_INTERACTION": "1", "LARAVEL_INSTALLER_DEFER_HOOKS": "1",
        "LARAVEL_INSTALLER_NO_NODE": "0" if node_installer else "1",
        "npm_config_offline": "true", "npm_config_package_lock": "false",
        "npm_config_audit": "false", "npm_config_fund": "false",
        "npm_config_update_notifier": "false", "npm_config_logs_dir": str(temp_directory / "npm-logs"),
    })
    if npm_cache:
        environment["npm_config_cache"] = str(npm_cache)
    # Keep the installed runtime's extensions/settings and give PHPStan enough
    # memory even when the machine's default PHP configuration only allows 128M.
    scanned = subprocess.check_output(["php", "-r", "echo php_ini_scanned_files();"], env=environment, text=True)
    scan_directories = list(dict.fromkeys(str(Path(name.strip()).parent) for name in scanned.split(",") if name.strip()))
    ini_directory = temp_directory / "php-ini"
    ini_directory.mkdir()
    (ini_directory / "zz-chisel-matrix.ini").write_text("memory_limit=512M\n")
    environment["PHP_INI_SCAN_DIR"] = os.pathsep.join([*scan_directories, str(ini_directory)])
    return environment


def configure_application(app):
    environment = (app / ".env.example").read_text()
    overrides = {
        "APP_ENV": "local", "APP_DEBUG": "false", "APP_URL": "http://localhost",
        "APP_KEY": "base64:" + base64.b64encode(os.urandom(32)).decode(),
        "DB_CONNECTION": "sqlite", "DB_DATABASE": '"' + str(app / "database/database.sqlite") + '"',
        "MAIL_MAILER": "array", "QUEUE_CONNECTION": "sync", "CACHE_STORE": "array", "SESSION_DRIVER": "array",
    }
    for key, value in overrides.items():
        pattern = r"^" + re.escape(key) + r"=.*$"
        if re.search(pattern, environment, re.MULTILINE):
            environment = re.sub(pattern, lambda _: key + "=" + value, environment, flags=re.MULTILINE)
        else:
            environment += "\n" + key + "=" + value + "\n"
    (app / ".env").write_text(environment)
    (app / ".env").chmod(0o600)


class Runner:
    def __init__(self, options, output, snapshot):
        self.options = options
        self.output = output
        self.snapshot = snapshot
        self.processes = set()
        self.lock = threading.Lock()
        self.stopping = threading.Event()

    def stop(self):
        self.stopping.set()
        with self.lock:
            for process in self.processes:
                self.terminate(process)

    @staticmethod
    def terminate(process):
        try:
            if os.name == "posix":
                os.killpg(process.pid, signal.SIGTERM)
            else:
                process.terminate()
        except ProcessLookupError:
            pass

    def command(self, result, name, command, app, environment):
        if self.stopping.is_set():
            raise RuntimeError("Matrix interrupted")
        log = self.output / result["label"] / (name + ".log")
        started = time.monotonic()
        record = {"name": name, "command": command, "log": str(log)}
        result["commands"].append(record)
        with log.open("w") as stream:
            stream.write("$ " + shlex.join(command) + "\n")
            stream.flush()
            process = subprocess.Popen(command, cwd=app, env=environment, stdout=stream, stderr=subprocess.STDOUT, start_new_session=os.name == "posix")
            with self.lock:
                self.processes.add(process)
            try:
                record["exit_code"] = process.wait(timeout=self.options.timeout)
            except subprocess.TimeoutExpired:
                self.terminate(process)
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    if os.name == "posix":
                        os.killpg(process.pid, signal.SIGKILL)
                    else:
                        process.kill()
                    process.wait()
                record["exit_code"] = process.returncode
                raise RuntimeError(f"{name} timed out after {self.options.timeout}s; see {log}")
            finally:
                with self.lock:
                    self.processes.discard(process)
                record["seconds"] = round(time.monotonic() - started, 2)
        require(record["exit_code"] == 0, f"{name} exited {record['exit_code']}; see {log}")
        return log

    def variant(self, mask):
        started = time.monotonic()
        features = selected_features(mask)
        label = f"{mask:02d}-" + ("node" if self.options.node_installer else "no-node")
        directory = self.output / label
        directory.mkdir()
        temp_directory = directory / "tmp"
        temp_directory.mkdir()
        app = directory / "app"
        result = {"mask": mask, "label": label, "features": features, "commands": [], "status": "failed", "app": str(app)}
        print(f"[{label}] Start: {', '.join(features) or 'no optional features'}", flush=True)
        try:
            if self.stopping.is_set():
                raise RuntimeError("Matrix interrupted")
            shutil.copytree(self.snapshot, app)
            for dependency in ("vendor", "node_modules"):
                clone_directory(self.options.root / dependency, app / dependency)
            configure_application(app)
            environment = isolated_environment(temp_directory, self.options.node_installer, self.options.npm_cache)
            self.command(result, "01-autoload", ["composer", "dump-autoload", "--no-scripts", "--no-interaction"], app, environment)
            self.command(result, "02-installer", ["php", "artisan", "install:features", "--answers=" + json.dumps({"auth_features": features}), "--no-interaction"], app, environment)
            validate_source(app, set(features))
            validate_schema(app, set(features))
            result["source_and_schema"] = "passed"

            # A preinstalled removed package must not conceal a stale TS import in
            # --no-node installations. The normal installer must remove it itself.
            for feature, package in (("2fa", "input-otp"), ("passkeys", "@laravel/passkeys")):
                package_directory = app / "node_modules" / package
                if feature not in features:
                    if self.options.node_installer:
                        require(not package_directory.exists(), f"npm retained removed dependency: {package}")
                    elif package_directory.exists():
                        shutil.rmtree(package_directory)

            probe = directory / "probe.php"
            probe.write_text(PROBE_PHP)
            for name, cache_command in (("03-routes", None), ("05-cached-routes", "route:cache")):
                if cache_command:
                    self.command(result, "04-route-cache", ["php", "artisan", cache_command, "--no-interaction"], app, environment)
                log = self.command(result, name, ["php", str(probe), str(app)], app, environment)
                runtime = json.loads(log.read_text().split("\n", 1)[1])
                validate_runtime(runtime, set(features))
                (directory / (name + ".json")).write_text(json.dumps(runtime, indent=2) + "\n")
            self.command(result, "06-route-clear", ["php", "artisan", "route:clear", "--no-interaction"], app, environment)
            result["routes_and_middleware"] = "passed (uncached and cached)"

            for name, script in (("07-frontend-fix", "check:fix"), ("08-frontend-check", "check"), ("09-types", "types:check"), ("10-build", "build")):
                self.command(result, name, ["npm", "run", script], app, environment)
            # Collect authoritative skipped-test counts through PHPUnit itself,
            # regardless of the console reporter installed in this checkout.
            junit = directory / "phpunit.xml"
            phpunit = ET.parse(app / "phpunit.xml")
            logging = phpunit.getroot().find("logging")
            if logging is None:
                logging = ET.SubElement(phpunit.getroot(), "logging")
            ET.SubElement(logging, "junit", {"outputFile": str(junit)})
            phpunit.write(app / "phpunit.xml", encoding="utf-8", xml_declaration=True)
            log = self.command(result, "11-composer-test", ["composer", "run", "test", "--no-interaction"], app, environment)
            for line in log.read_text().splitlines():
                if line.startswith('{"tool":"phpunit"'):
                    result["phpunit"] = json.loads(line)
            report = ET.parse(junit)
            testcases = report.findall(".//testcase")
            skipped = [case.get("name") for case in testcases if case.find("skipped") is not None]
            require(not skipped, f"Generated application has skipped tests: {skipped}")
            require(testcases, "PHPUnit did not execute any tests")
            result["phpunit_testcases"] = len(testcases)
            result["phpunit_skipped"] = 0
            validate_source(app, set(features))
            result["status"] = "passed"
            if not self.options.keep_success:
                shutil.rmtree(app)
                result["app"] = None
                shutil.rmtree(temp_directory)
        except Exception as error:
            result["error"] = str(error)
        result["seconds"] = round(time.monotonic() - started, 2)
        (directory / "result.json").write_text(json.dumps(result, indent=2) + "\n")
        print(f"[{label}] {result['status'].upper()} ({result['seconds']}s)" + (f": {result['error']}" if "error" in result else ""), flush=True)
        return result


def validate_source(app, features):
    for feature, paths in FEATURE_FILES.items():
        for relative in paths:
            require((app / relative).is_file() == (feature in features), f"Unexpected {feature} file presence: {relative}")
    for relative in REMOVED_MAINTAINER_FILES:
        require(not (app / relative).exists(), f"Maintainer file survived: {relative}")
    require((app / "README.md").is_file(), "Application README was removed")
    require((app / "resources/js/components/action-confirmation-provider.tsx").is_file(), "Action confirmation UI was removed")
    package = json.loads((app / "package.json").read_text())
    for feature, dependency in (("2fa", "input-otp"), ("passkeys", "@laravel/passkeys")):
        present = any(dependency in package.get(section, {}) for section in ("dependencies", "devDependencies", "optionalDependencies"))
        require(present == (feature in features), f"Incorrect dependency selection: {dependency}")
    composer = json.loads((app / "composer.json").read_text())
    require(not any("install:features" in command for command in composer["scripts"].get("post-update-cmd", [])), "Composer feature-install hook survived")
    for area in SOURCE_AREAS:
        for source in (app / area).rglob("*"):
            if source.is_file() and source.suffix in (".php", ".ts", ".tsx", ".css"):
                content = source.read_text()
                require(not re.search(r"@(end-)?chisel-[\w-]+", content), f"Chisel marker survived: {source.relative_to(app)}")


def validate_schema(app, features):
    database = app / "database/database.sqlite"
    require(database.is_file(), "Installer did not create SQLite database")
    with sqlite3.connect("file:" + str(database) + "?mode=ro", uri=True) as connection:
        tables = {row[0] for row in connection.execute("select name from sqlite_master where type = 'table'")}
        require({"users", "password_reset_tokens", "sessions", "pending_email_changes", "migrations"} <= tables, "Installer did not migrate required tables")
        require(("passkeys" in tables) == ("passkeys" in features), "Passkey table does not match selection")
        columns = {row[1] for row in connection.execute("pragma table_info(users)")}
        for name in ("two_factor_secret", "two_factor_recovery_codes", "two_factor_confirmed_at"):
            require((name in columns) == ("2fa" in features), f"2FA database column does not match selection: {name}")
        # Email-change verification is independent of optional sign-up verification.
        require("email_verified_at" in columns, "Email-change verification timestamp was removed")
        migrations = {row[0] for row in connection.execute("select migration from migrations")}
        for feature, migration in (("2fa", "2025_08_14_170933_add_two_factor_columns_to_users_table"), ("passkeys", "2024_01_01_000000_create_passkeys_table")):
            require((migration in migrations) == (feature in features), f"Unexpected migration history for {feature}")


def validate_runtime(runtime, features):
    routes = runtime["routes"]
    for feature, names in ROUTES.items():
        for name in names:
            require((name in routes) == (feature in features), f"Unexpected {feature} route presence: {name}")
    confirmation = "password-confirmation" in features
    for name in ("passkey.confirm-options", "passkey.confirm"):
        require((name in routes) == (confirmation and "passkeys" in features), f"Unexpected passkey-confirmation route presence: {name}")
    for name in ("login", "login.store", "logout", "password.request", "password.email", "password.reset", "password.update", "dashboard", "profile.edit", "profile.update", "profile.destroy", "profile.email.store", "profile.email.destroy", "profile.email.confirm", "profile.email.update", "security.edit", "user-password.update"):
        require(name in routes, f"Required application route removed: {name}")
    require(runtime["password_confirmation"] == confirmation, "Confirmation config differs from selection")
    for feature, configured in (("registration", "registration"), ("email-verification", "email-verification"), ("2fa", "two-factor-authentication"), ("passkeys", "passkeys")):
        require((configured in runtime["features"]) == (feature in features), f"Fortify feature config differs: {feature}")
    for feature, collection, name in (
        ("email-verification", "user_interfaces", "Illuminate\\Contracts\\Auth\\MustVerifyEmail"),
        ("passkeys", "user_interfaces", "Laravel\\Fortify\\Contracts\\PasskeyUser"),
        ("passkeys", "user_traits", "Laravel\\Fortify\\PasskeyAuthenticatable"),
        ("2fa", "user_traits", "Laravel\\Fortify\\TwoFactorAuthenticatable"),
    ):
        require((name in runtime[collection]) == (feature in features), f"User model still references removed {feature}: {name}")
    sensitive = ["profile.email.store", "profile.destroy"]
    if "2fa" in features:
        sensitive += list(ROUTES["2fa"][2:])
    if "passkeys" in features:
        sensitive += ["passkey.registration-options", "passkey.store", "passkey.destroy"]
    for name in sensitive:
        middleware = routes[name]["middleware"]
        present = any("ConfirmSensitiveAction" in item or "RequirePassword" in item for item in middleware)
        require(present == confirmation, f"Wrong sensitive-action middleware on {name}: {middleware}")
    for name in ("profile.edit", "security.edit", "user-password.update"):
        require(not any("ConfirmSensitiveAction" in item or "RequirePassword" in item for item in routes[name]["middleware"]), f"Unexpected password-confirmation middleware on {name}")
    for name in ("dashboard", "security.edit", "profile.destroy"):
        present = any("EnsureEmailIsVerified" in item for item in routes[name]["middleware"])
        require(present == ("email-verification" in features), f"Wrong email-verification middleware on {name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="Starter-kit source checkout")
    parser.add_argument("--masks", type=parse_masks, default=list(range(32)), help="Comma-separated feature masks; default all 32. Bits: email=1, registration=2, 2FA=4, passkeys=8, confirmation=16")
    parser.add_argument("--node-installer", action="store_true", help="Run the installer's real npm install/remove/build path, offline")
    parser.add_argument("--npm-cache", type=Path, help="Existing npm cache to reuse for offline Node installer runs")
    parser.add_argument("--workers", type=int, choices=(1, 2), default=2, help="Maximum parallel disposable applications (default 2)")
    parser.add_argument("--timeout", type=int, default=900, help="Per-command timeout in seconds (default 900)")
    parser.add_argument("--keep-success", action="store_true", help="Keep successful application copies as well as failed copies")
    options = parser.parse_args()
    options.root = options.root.resolve()
    if options.npm_cache:
        options.npm_cache = options.npm_cache.resolve()
        require(options.npm_cache.is_dir(), "Specified npm cache directory does not exist")
    for dependency in ("vendor/autoload.php", "node_modules/.bin/tsc", ".env.example", "chisel.php"):
        require((options.root / dependency).exists(), f"Required installed dependency/source missing: {dependency}")
    for command in ("php", "composer", "npm", "git"):
        require(shutil.which(command), f"Required executable unavailable: {command}")
    require(options.timeout > 0, "Timeout must be positive")
    output = Path(tempfile.mkdtemp(prefix="chisel-matrix-")).resolve()
    snapshot = output / "source"
    snapshot.mkdir()
    summary = {"root": str(options.root), "output": str(output), "node_installer": options.node_installer, "masks": options.masks, "feature_bits": {feature: 1 << bit for bit, feature in enumerate(FEATURES)}, "source": snapshot_source(options.root, snapshot), "results": []}
    print(f"Matrix logs and summary: {output}", flush=True)
    runner = Runner(options, output, snapshot)
    summary_path = output / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=options.workers)
    interrupted = False
    try:
        futures = [executor.submit(runner.variant, mask) for mask in options.masks]
        for future in concurrent.futures.as_completed(futures):
            summary["results"].append(future.result())
            summary["results"].sort(key=lambda item: item["mask"])
            summary_path.write_text(json.dumps(summary, indent=2) + "\n")
    except KeyboardInterrupt:
        interrupted = True
        runner.stop()
        for future in futures:
            future.cancel()
    finally:
        executor.shutdown(wait=True)
    failures = sum(result["status"] != "passed" for result in summary["results"])
    print(f"Completed {len(summary['results'])}/{len(options.masks)} selections: {failures} failed. Summary: {summary_path}", flush=True)
    return 130 if interrupted else int(failures > 0)


if __name__ == "__main__":
    sys.exit(main())
