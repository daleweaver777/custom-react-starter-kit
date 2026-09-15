<?php

namespace Tests\Support;

use OpenSSLAsymmetricKey;

/** A disposable software authenticator: real EC keys, WebAuthn challenges and signatures. */
class PasskeyAuthenticator
{
    private OpenSSLAsymmetricKey $key;

    private string $id;

    private string $userHandle;

    public function __construct()
    {
        $this->key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
        $this->id = random_bytes(32);
    }

    public function register(array $options, string $origin): array
    {
        $this->userHandle = $options['user']['id'];
        $ec = openssl_pkey_get_details($this->key)['ec'];
        $coseKey = "\xa5\x01\x02\x03\x26\x20\x01\x21\x58\x20".$ec['x']."\x22\x58\x20".$ec['y'];
        $authData = hash('sha256', $options['rp']['id'], true)."\x45".pack('N', 0)
            .str_repeat("\0", 16).pack('n', strlen($this->id)).$this->id.$coseKey;
        $attestation = "\xa3\x63fmt\x64none\x67attStmt\xa0\x68authData\x58".chr(strlen($authData)).$authData;

        return $this->credential([
            'attestationObject' => $this->encode($attestation),
            'clientDataJSON' => $this->encode(json_encode(['type' => 'webauthn.create', 'challenge' => $options['challenge'], 'origin' => $origin])),
            'transports' => ['internal'],
        ]);
    }

    public function verify(array $options, string $origin): array
    {
        $clientData = json_encode(['type' => 'webauthn.get', 'challenge' => $options['challenge'], 'origin' => $origin]);
        $authData = hash('sha256', $options['rpId'], true)."\x05".pack('N', 1);
        openssl_sign($authData.hash('sha256', $clientData, true), $signature, $this->key, OPENSSL_ALGO_SHA256);

        return $this->credential([
            'clientDataJSON' => $this->encode($clientData),
            'authenticatorData' => $this->encode($authData),
            'signature' => $this->encode($signature),
            'userHandle' => $this->userHandle,
        ]);
    }

    private function credential(array $response): array
    {
        return ['id' => $this->encode($this->id), 'rawId' => $this->encode($this->id), 'type' => 'public-key', 'response' => $response, 'clientExtensionResults' => (object) []];
    }

    private function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
