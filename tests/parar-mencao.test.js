const test = require('node:test');
const assert = require('node:assert/strict');

const command = require('../commands/parar-mencao.js');

test('o comando parar-mencao tem uma opção de canal', () => {
  assert.equal(command.data.name, 'parar-mencao');

  const options = command.data.options || [];
  const optionNames = options.map((option) => option.name);

  assert.ok(optionNames.includes('canal'));
});
