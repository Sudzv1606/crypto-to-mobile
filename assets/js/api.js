console.log('CashCrypto API script loaded.');

async function fetchCryptoRates() {
  console.log('Fetching crypto rates...');
  try {
    // Fetch BTC and USDT rates in USD from CoinGecko (free)
    const cryptoResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd', {
      mode: 'cors',
      headers: { 'Accept': 'application/json' },
    });
    if (!cryptoResponse.ok) throw new Error(`Crypto API error! Status: ${cryptoResponse.status}`);
    const cryptoData = await cryptoResponse.json();
    const btcPriceUsd = cryptoData.bitcoin?.usd || 0;
    const usdtPriceUsd = cryptoData.tether?.usd || 1;
    if (!btcPriceUsd) throw new Error('BTC price not found');

    // Fetch real-time USD-to-local rates from ExchangeRate-API (free)
    const forexResponse = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!forexResponse.ok) throw new Error(`Forex API error! Status: ${forexResponse.status}`);
    const forexData = await forexResponse.json();
    const exchangeRates = {
      KES: forexData.rates.KES || 130,
      NGN: forexData.rates.NGN || 1600,
      PHP: forexData.rates.PHP || 58,
      GHS: forexData.rates.GHS || 15,
      TZS: forexData.rates.TZS || 2700
    };

    // Calculate rates
    const rates = {
      btc: {},
      usdt: {}
    };
    for (const [currency, rate] of Object.entries(exchangeRates)) {
      rates.btc[currency] = btcPriceUsd * rate;
      rates.usdt[currency] = usdtPriceUsd * rate;
    }

    console.log('Calculated rates:', rates);
    updateRatesInDOM(rates);
    return rates;
  } catch (error) {
    console.error('Error fetching rates:', error.message);
    const fallbackRates = {
      btc: { KES: 3850000, NGN: 46000000, PHP: 2100000, GHS: 540000, TZS: 98000000 },
      usdt: { KES: 130, NGN: 1600, PHP: 58, GHS: 15, TZS: 2700 }
    };
    updateRatesInDOM(fallbackRates);
    return fallbackRates;
  }
}

function updateRatesInDOM(rates) {
  const isHomepage = window.location.pathname === '/' || window.location.pathname.includes('index.html');

  if (isHomepage) {
    const rateElements = [
      { id: 'btc-to-kes-rate', currency: 'KES' },
      { id: 'usdt-to-kes-rate', currency: 'KES' },
      { id: 'btc-to-ngn-rate', currency: 'NGN' },
      { id: 'usdt-to-ngn-rate', currency: 'NGN' },
      { id: 'btc-to-php-rate', currency: 'PHP' },
      { id: 'usdt-to-php-rate', currency: 'PHP' },
      { id: 'btc-to-ghs-rate', currency: 'GHS' },
      { id: 'usdt-to-ghs-rate', currency: 'GHS' },
      { id: 'btc-to-tzs-rate', currency: 'TZS' },
      { id: 'usdt-to-tzs-rate', currency: 'TZS' }
    ];

    rateElements.forEach(({ id, currency }) => {
      updateRate(id, rates.btc[currency], currency);
      updateRate(id.replace('btc', 'usdt'), rates.usdt[currency], currency);
    });
  } else {
    const path = window.location.pathname;
    let targetCurrency = 'KES';
    if (path.includes('btc-to-naira')) targetCurrency = 'NGN';
    else if (path.includes('btc-to-gcash')) targetCurrency = 'PHP';
    else if (path.includes('btc-to-airtel')) targetCurrency = 'GHS';
    else if (path.includes('btc-to-vodacom-mpesa')) targetCurrency = 'TZS';

    updateRate('btc-to-kes-rate', rates.btc[targetCurrency], targetCurrency);
    updateRate('usdt-to-kes-rate', rates.usdt[targetCurrency], targetCurrency);
    updateRate('live-btc-rate', rates.btc[targetCurrency], '');
    updateRate('live-usdt-rate', rates.usdt[targetCurrency], '');

    const updateTime = document.getElementById('update-time');
    if (updateTime) updateTime.textContent = new Date().toLocaleTimeString();
  }
}

function updateRate(elementId, rate, currency) {
  const element = document.getElementById(elementId);
  if (element) {
    if (element.classList.contains('loading')) element.classList.remove('loading');
    element.textContent = currency ? `${Math.round(rate).toLocaleString()} ${currency}` : `${Math.round(rate).toLocaleString()}`;
  }
}

function setupCalculator(rates) {
  const amountInput = document.getElementById('crypto-amount');
  const cryptoTypeSelect = document.getElementById('crypto-type');
  const calculateBtn = document.getElementById('calculate-btn');
  const resultSpan = document.getElementById('result-amount');

  if (!amountInput || !cryptoTypeSelect || !calculateBtn || !resultSpan) {
    console.log('Calculator elements not found.');
    return;
  }

  const path = window.location.pathname;
  let targetCurrency = 'KES';
  if (path.includes('btc-to-naira')) targetCurrency = 'NGN';
  else if (path.includes('btc-to-gcash')) targetCurrency = 'PHP';
  else if (path.includes('btc-to-airtel')) targetCurrency = 'GHS';
  else if (path.includes('btc-to-vodacom-mpesa')) targetCurrency = 'TZS';

  calculateBtn.addEventListener('click', () => {
    const amount = parseFloat(amountInput.value) || 0;
    const cryptoType = cryptoTypeSelect.value;
    const rate = cryptoType === 'BTC' ? rates.btc[targetCurrency] : rates.usdt[targetCurrency];
    const convertedAmount = amount * rate;
    resultSpan.textContent = `${new Intl.NumberFormat().format(Math.round(convertedAmount))} ${targetCurrency}`;
  });

  return function updateCalculator(newRates) {
    rates = newRates;
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded event fired.');
  const rates = await fetchCryptoRates();
  const updateCalculator = setupCalculator(rates);

  const isHomepage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
  if (!isHomepage) {
    setInterval(async () => {
      const newRates = await fetchCryptoRates();
      updateCalculator(newRates);
    }, 60000); // Every minute
  }
});