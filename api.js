console.log('CashCrypto API script loaded.');

async function fetchCryptoRates() {
  console.log('Fetching crypto rates...');
  try {
    // Use CORS proxy for CoinGecko API
    const cryptoResponse = await fetch('https://cors-anywhere.herokuapp.com/https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd', {
      mode: 'cors',
      headers: { 'Accept': 'application/json' },
    });
    if (!cryptoResponse.ok) throw new Error(`Crypto API error! Status: ${cryptoResponse.status}`);
    const cryptoData = await cryptoResponse.json();
    const btcPriceUsd = cryptoData.bitcoin?.usd || 0;
    const usdtPriceUsd = cryptoData.tether?.usd || 1;
    if (!btcPriceUsd) throw new Error('BTC price not found');
    console.log('Crypto data:', { btcPriceUsd, usdtPriceUsd });

    // Use CORS proxy for ExchangeRate-API
    const forexResponse = await fetch('https://cors-anywhere.herokuapp.com/https://open.er-api.com/v6/latest/USD');
    if (!forexResponse.ok) throw new Error(`Forex API error! Status: ${forexResponse.status}`);
    const forexData = await forexResponse.json();
    console.log('Forex data:', forexData);
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
    console.log('Using fallback rates:', fallbackRates);
    updateRatesInDOM(fallbackRates);
    return fallbackRates;
  }
}

function updateRatesInDOM(rates) {
  console.log('Updating rates in DOM...');
  const isHomepage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
  console.log('Is homepage:', isHomepage);

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
      console.log(`Updating element ${id} with BTC rate: ${rates.btc[currency]}`);
      updateRate(id, rates.btc[currency], currency);
      console.log(`Updating element ${id.replace('btc', 'usdt')} with USDT rate: ${rates.usdt[currency]}`);
      updateRate(id.replace('btc', 'usdt'), rates.usdt[currency], currency);
    });
  } else {
    const path = window.location.pathname;
    let targetCurrency = 'KES';
    if (path.includes('btc-to-naira')) targetCurrency = 'NGN';
    else if (path.includes('btc-to-gcash')) targetCurrency = 'PHP';
    else if (path.includes('btc-to-airtel')) targetCurrency = 'GHS';
    else if (path.includes('btc-to-vodacom-mpesa')) targetCurrency = 'TZS';

    console.log(`Updating non-homepage rates for ${targetCurrency}`);
    updateRate('btc-to-kes-rate', rates.btc[targetCurrency], targetCurrency);
    updateRate('usdt-to-kes-rate', rates.usdt[targetCurrency], targetCurrency);
    updateRate('live-btc-rate', rates.btc[targetCurrency], '');
    updateRate('live-usdt-rate', rates.usdt[targetCurrency], '');

    const updateTime = document.getElementById('update-time');
    if (updateTime) {
      updateTime.textContent = new Date().toLocaleTimeString();
      console.log('Updated time:', updateTime.textContent);
    }
  }
}

function updateRate(elementId, rate, currency) {
  const element = document.getElementById(elementId);
  if (element) {
    if (element.classList.contains('loading')) element.classList.remove('loading');
    element.textContent = currency ? `${Math.round(rate).toLocaleString()} ${currency}` : `${Math.round(rate).toLocaleString()}`;
    console.log(`Updated ${elementId} to ${element.textContent}`);
  } else {
    console.warn(`Element with ID ${elementId} not found in DOM`);
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
    console.log(`Calculated: ${amount} ${cryptoType} = ${convertedAmount} ${targetCurrency}`);
  });

  return function updateCalculator(newRates) {
    rates = newRates;
    console.log('Calculator updated with new rates:', rates);
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
