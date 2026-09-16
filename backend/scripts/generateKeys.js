const crypto = require('crypto');

const generateAuthorityKeys = () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    console.log('=== AUTHORITY PRIVATE KEY ===');
    console.log(privateKey);

    console.log('=== AUTHORITY PUBLIC KEY ===');
    console.log(publicKey);

    return { publicKey, privateKey };
};

if (require.main === module) {
    generateAuthorityKeys();
}

module.exports = generateAuthorityKeys;
