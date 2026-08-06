const test = require('node:test');
const assert = require('node:assert/strict');
const {
    authEmailForUsername,
    conflictingTechnicianDocuments,
    matchesUsernameIdentity,
    normalizeUsername,
    selectPreferredTechnicianDocument
} = require('../services/authIdentityUtils');

function fakeDocument(id, data) {
    return { id, data: () => data };
}

test('login aliases are deterministic across case, spaces and accents', () => {
    assert.equal(normalizeUsername('  Jazmin Vasquez  '), 'jazmin vasquez');
    assert.equal(authEmailForUsername(' José  Núñez '), 'jose.nunez@corinfar.local');
    assert.equal(authEmailForUsername('JOSE NUNEZ'), 'jose.nunez@corinfar.local');
});

test('linked and active profiles win over unlinked legacy duplicates', () => {
    const legacy = fakeDocument('legacy', {
        username: 'Kellyn Zelaya',
        isActive: true
    });
    const linked = fakeDocument('linked', {
        username: 'Kellyn Zelaya',
        isActive: true,
        authUid: 'firebase-uid',
        authEmail: 'kellyn.zelaya@corinfar.local'
    });
    assert.equal(selectPreferredTechnicianDocument([legacy, linked]).id, 'linked');
});

test('inactive profiles cannot displace an active profile', () => {
    const inactive = fakeDocument('inactive', {
        isActive: false,
        authUid: 'old-uid',
        authEmail: 'old@corinfar.local'
    });
    const active = fakeDocument('active', { isActive: true });
    assert.equal(selectPreferredTechnicianDocument([inactive, active]).id, 'active');
});

test('profile uniqueness ignores only the record currently being edited', () => {
    const current = fakeDocument('current', {});
    const duplicate = fakeDocument('duplicate', {});
    assert.deepEqual(conflictingTechnicianDocuments([current], 'current'), []);
    assert.deepEqual(
        conflictingTechnicianDocuments([current, duplicate], 'current').map(item => item.id),
        ['duplicate']
    );
});

test('legacy profiles without normalized fields still block duplicate aliases', () => {
    assert.equal(matchesUsernameIdentity({ username: 'Ana Martinez' }, ' ana martinez '), true);
    assert.equal(matchesUsernameIdentity({ authEmail: 'jose.nunez@corinfar.local' }, 'José Núñez'), true);
    assert.equal(matchesUsernameIdentity({ username: 'Otra Persona' }, 'Ana Martinez'), false);
});
