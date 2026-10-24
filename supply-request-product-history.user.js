// ==UserScript==
// @name         Таблица движения товара на странице заявки
// @namespace    https://github.com/timon174174174174-source/lifemart-tamper
// @version      1.2.0
// @description  Показывает историю движения товара и время последней продажи
// @author       You
// @homepageURL  https://github.com/timon174174174174-source/lifemart-tamper
// @source       https://github.com/timon174174174174-source/lifemart-tamper
// @updateURL    https://raw.githubusercontent.com/timon174174174174-source/lifemart-tamper/main/supply-request-product-history.user.js
// @downloadURL  https://raw.githubusercontent.com/timon174174174174-source/lifemart-tamper/main/supply-request-product-history.user.js
// @match        https://su.lifemart.ru/turnover/supplyRequest/view/*
// @match        https://su.eda1.ru/turnover/supplyRequest/view/*
// @match        https://su.lifemart.ru/turnover/supplyRequest/updateSuppliers/*
// @match        https://su.eda1.ru/turnover/supplyRequest/updateSuppliers/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=eda1.ru
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'https://185-121-235-17.sslip.io:8443/su/get_product_history';
    const CELL_STYLE = {
        border: '1px solid #dddddd',
        padding: '5px',
    };

    function buildHistoryUrl(productName, departmentName) {
        const url = new URL(API_URL);
        url.search = new URLSearchParams({
            name: productName,
            department: departmentName,
        }).toString();

        return url.toString();
    }

    function formatMovement(row, previousRow) {
        const end = previousRow && typeof previousRow.end !== 'undefined' ? previousRow.end : 0;
        const waybill = typeof row.waybill !== 'undefined' ? row.waybill : 0;
        const realization = typeof row.realization !== 'undefined' ? row.realization : 0;
        const writeoff = typeof row.writeoff !== 'undefined' ? row.writeoff : 0;
        const lastSale = typeof row.lastRealizationTime === 'string'
            && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.lastRealizationTime)
            ? ` (${row.lastRealizationTime})`
            : '';

        return `${end}+${waybill}-${realization}${lastSale} (-${writeoff})`;
    }

    if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
        module.exports = { buildHistoryUrl, formatMovement };
        return;
    }

    const orderWeekDay = getWeekDay(new Date());

    $('body').on('mouseleave', 'table.items tbody tr, table.table-style tbody tr', function () {
        const row = $(this);
        const controller = row.data('product-history-controller');
        if (controller) {
            controller.abort();
        }
        row.removeData('product-history-controller');
        row.children('.product-history-tooltip').remove();
    });

    $('body').on('mouseenter', 'table.items tbody tr, table.table-style tbody tr', async function (event) {
        const row = $(this);
        let productName = row.children('td:first-child').text().trim();
        if (productName === '') {
            productName = row.children('td').first().children('a').text().trim();
        }

        const departmentName = $('table.detail-view tr').eq(5).find('td').text().trim();
        const controller = new AbortController();
        row.data('product-history-controller', controller);
        row.css('position', 'relative');
        row.children('.product-history-tooltip').remove();

        const tooltip = $('<span class="product-history-tooltip">').css({
            display: 'block',
            position: 'fixed',
            overflow: 'hidden',
            'z-index': 1000,
            'background-color': 'white',
            'border-radius': '5px',
            border: '1px solid #dddddd',
        });
        tooltip.text('Загрузка…');
        row.append(tooltip);
        positionTooltip(tooltip[0], event.clientX, event.clientY);

        try {
            const response = await fetch(buildHistoryUrl(productName, departmentName), {
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const history = await response.json();
            if (!Array.isArray(history)) {
                throw new Error('Некорректный формат ответа');
            }
            if (!document.body.contains(tooltip[0])) {
                return;
            }

            const table = $('<table>').css({
                width: '100%',
                border: '1px solid #dddddd',
                'border-collapse': 'collapse',
            });

            history.forEach(function (historyRow, index) {
                const tableRow = $('<tr>').css({
                    'font-weight': 'bold',
                    padding: '5px',
                    background: '#efefef',
                    border: '1px solid #dddddd',
                });
                const date = typeof historyRow.date === 'string' ? historyRow.date : '';
                $('<td>').css(CELL_STYLE).text(date).appendTo(tableRow);
                $('<td>')
                    .css(CELL_STYLE)
                    .text(formatMovement(historyRow, history[index - 1] || null))
                    .appendTo(tableRow);

                if (date.includes(orderWeekDay)) {
                    tableRow.css('background-color', '#d2ffbc');
                }
                table.append(tableRow);
            });

            tooltip.empty().append(table);
            positionTooltip(tooltip[0], event.clientX, event.clientY);
        } catch (error) {
            if (error.name !== 'AbortError' && document.body.contains(tooltip[0])) {
                tooltip.text('Не удалось загрузить историю');
                positionTooltip(tooltip[0], event.clientX, event.clientY);
            }
        }
    });

    window.addEventListener('mousemove', function (event) {
        const tooltip = document.querySelector('.product-history-tooltip');
        if (!tooltip) {
            return;
        }
        positionTooltip(tooltip, event.clientX, event.clientY);
    });

    function positionTooltip(tooltip, x, y) {
        tooltip.style.top = `${y - tooltip.offsetHeight + 50}px`;
        tooltip.style.left = `${x + 20}px`;
    }

    function getWeekDay(date) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        let dayIndex = date.getDay() + 2;
        if (dayIndex >= 5) {
            dayIndex %= 7;
        }

        return days[dayIndex];
    }
}());
