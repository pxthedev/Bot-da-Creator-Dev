const test = require('node:test');
const assert = require('node:assert/strict');

const command = require('../commands/mencao.js');

test('o comando de menção registra opções para canal, mensagem e intervalo', () => {
  assert.equal(command.data.name, 'mencao');

  const options = command.data.options || [];
  const optionNames = options.map((option) => option.name);

  assert.ok(optionNames.includes('canal'));
  assert.ok(optionNames.includes('mensagem'));
  assert.ok(optionNames.includes('intervalo'));

  const intervaloOption = options.find((option) => option.name === 'intervalo');
  assert.deepEqual(intervaloOption.choices.map((choice) => choice.value), [1, 3, 6, 12, 24]);
});
