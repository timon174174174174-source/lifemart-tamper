const assert = require('assert');
const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'supply-request-product-history.user.js');

assert.ok(fs.existsSync(scriptPath), 'Userscript ещё не создан');

const source = fs.readFileSync(scriptPath, 'utf8');
const rawUrl = 'https://raw.githubusercontent.com/timon174174174174-source/lifemart-tamper/main/supply-request-product-history.user.js';

for (const fragment of [
    '// @version      1.1.0',
    `// @updateURL    ${rawUrl}`,
    `// @downloadURL  ${rawUrl}`,
]) {
    assert.ok(source.includes(fragment), `Не найдено metadata: ${fragment}`);
}

assert.strictEqual((source.match(/\/\/ @grant\s+/g) || []).length, 1, 'Должен быть ровно один @grant');
assert.ok(source.includes('// @grant        none'), 'Userscript должен работать с @grant none');
assert.ok(!source.includes('Онигири%20с%20куриным'), 'Тестовый запрос при загрузке страницы нужно удалить');

const { buildHistoryUrl, formatMovement } = require(scriptPath);

const historyUrl = new URL(buildHistoryUrl('Рап & ролл + сыр', 'Миниформат / ЕКБ #1'));
assert.strictEqual(historyUrl.origin + historyUrl.pathname, 'https://dev-6.targethunter.dev/su/get_product_history');
assert.strictEqual(historyUrl.searchParams.get('name'), 'Рап & ролл + сыр');
assert.strictEqual(historyUrl.searchParams.get('department'), 'Миниформат / ЕКБ #1');

assert.strictEqual(
    formatMovement(
        { waybill: '1', realization: '4', writeoff: '2', lastRealizationTime: '19:10' },
        { end: '3' }
    ),
    '3+1-4 (19:10) (-2)'
);

assert.strictEqual(
    formatMovement({ realization: '1' }, null),
    '0+0-1 (-0)'
);

assert.strictEqual(
    formatMovement({ realization: '1', lastRealizationTime: 'не время' }, { end: '1' }),
    '1+0-1 (-0)',
    'Некорректное время нельзя показывать'
);

console.log('OK');
