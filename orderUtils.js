const qs = require('node:querystring');
const crypto = require('node:crypto');
const Big = require('big.js');

function get_epoch_ms() {
    return Date.now(); // js returns ms unlike python s or nanos
}

function get_signature(message_str, SECRET) {
    // each hmac can only be 'used' once
    return crypto.createHmac('sha256', SECRET).update(message_str).digest('hex');
}

function craft_binance_perp_order_url(params, SECRET) {
    const order_endpoint = 'https://fapi.binance.com' + '/fapi/v1/order';

    // delete signature if any
    delete params.signature;

    params.timestamp = get_epoch_ms();

    let str_to_be_signed = qs.stringify(params);
    params.signature = get_signature(str_to_be_signed, SECRET);

    let signed_query_params = qs.stringify(params);

    return order_endpoint + '?' + signed_query_params;
}

function send_binance_limit_order(raw_params, KEY, SECRET) {
    // raw_params { symbol, side, quantity, price }
    const headers = {
        'Content-Type': 'application/json',
        'X-MBX-APIKEY': KEY,
    };

    const fetch_options = {
        method: 'POST',
        headers: headers,
    };

    let params = {
        symbol: raw_params.symbol,
        side: raw_params.side,
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity: raw_params.quantity,
        price: raw_params.price,
    };

    let signed_url = craft_binance_perp_order_url(params, SECRET);

    fetch(signed_url, fetch_options)
        .then((res) => {
            // console.log(get_epoch_ms(), 'response from api');
            console.log(res.status);
            if (res.ok) console.log('success');

            if (res.status == 400) {
                return res.json();
            }
        })
        .then((data) => {});
}

// round numbers in ui
function round_step_size(value, tickSize) {
    // price/qty should be within 9dp, else returns scientific notation e-7
    let bigValue = Big(value);
    let bigTick = Big(tickSize);

    let bigRemainder = bigValue.mod(bigTick);
    let roundedValue = bigValue.minus(bigRemainder);

    return roundedValue.toNumber();
}

module.exports = {
    send_binance_limit_order,
};
