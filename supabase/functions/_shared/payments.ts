
const IYZICO_BASE = Deno.env.get('IYZICO_BASE_URL') ?? 'https://api.iyzipay.com';
const IYZICO_KEY = Deno.env.get('IYZICO_API_KEY') ?? '';
const IYZICO_SECRET = Deno.env.get('IYZICO_SECRET_KEY') ?? '';

// Garanti TEST ortamı varsayılanları — Garanti'nin genel/public test seti
// (gizli değil). Canlıya geçerken Supabase secrets ile override edilir:
//   GARANTI_MODE=PROD, GARANTI_MERCHANT_ID, GARANTI_TERMINAL_ID,
//   GARANTI_STORE_KEY, GARANTI_PROVISION_PWD, GARANTI_3D_URL (prod gt3dengine).
const GARANTI_MODE = Deno.env.get('GARANTI_MODE') ?? 'TEST';
const GARANTI_MERCHANT_ID = Deno.env.get('GARANTI_MERCHANT_ID') ?? '7000679';
const GARANTI_TERMINAL_ID = Deno.env.get('GARANTI_TERMINAL_ID') ?? '30691297';
const GARANTI_STORE_KEY = Deno.env.get('GARANTI_STORE_KEY') ?? '12345678';
const GARANTI_PROVISION_PWD = Deno.env.get('GARANTI_PROVISION_PWD') ?? '123qweASD/';
const GARANTI_PROV_USER_ID = Deno.env.get('GARANTI_PROV_USER_ID') ?? 'PROVAUT';
const GARANTI_3D_URL =
  Deno.env.get('GARANTI_3D_URL') ??
  'https://sanalposprovtest.garantibbva.com.tr/servlet/gt3dengine';

const PUBLIC_URL = Deno.env.get('PUBLIC_URL') ?? '';

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// Garanti 3D istek hash'i: SHA512 hex, BÜYÜK harf.
async function sha512Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// Garanti 3D yanıt (callback) hash'i: SHA512 base64.
async function sha512Base64(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function hmacSha256Base64(key: string, payload: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(payload),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export interface IyzicoInitParams {
  conversationId: string;
  price: number;
  paidPrice: number;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    gsmNumber: string;
    identityNumber: string;
    address: string;
    city: string;
  };
  basketItems: Array<{ id: string; name: string; price: number }>;
  card: {
    holderName: string;
    number: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
  };
}

export async function initIyzicoThreeDs(params: IyzicoInitParams) {
  const body = {
    locale: 'tr',
    conversationId: params.conversationId,
    price: params.price.toFixed(2),
    paidPrice: params.paidPrice.toFixed(2),
    currency: 'TRY',
    installment: 1,
    basketId: params.conversationId,
    paymentChannel: 'MOBILE',
    paymentGroup: 'PRODUCT',
    callbackUrl: `${PUBLIC_URL}/functions/v1/iyzico-webhook`,
    paymentCard: {
      cardHolderName: params.card.holderName,
      cardNumber: params.card.number.replace(/\s+/g, ''),
      expireMonth: params.card.expireMonth,
      expireYear: params.card.expireYear,
      cvc: params.card.cvc,
      registerCard: 0,
    },
    buyer: {
      id: params.buyer.id,
      name: params.buyer.name,
      surname: params.buyer.surname,
      gsmNumber: params.buyer.gsmNumber,
      email: params.buyer.email,
      identityNumber: params.buyer.identityNumber,
      registrationAddress: params.buyer.address,
      ip: '127.0.0.1',
      city: params.buyer.city,
      country: 'Turkey',
    },
    shippingAddress: {
      contactName: `${params.buyer.name} ${params.buyer.surname}`,
      city: params.buyer.city,
      country: 'Turkey',
      address: params.buyer.address,
    },
    billingAddress: {
      contactName: `${params.buyer.name} ${params.buyer.surname}`,
      city: params.buyer.city,
      country: 'Turkey',
      address: params.buyer.address,
    },
    basketItems: params.basketItems.map(i => ({
      id: i.id,
      name: i.name,
      category1: 'Yemek',
      itemType: 'PHYSICAL',
      price: i.price.toFixed(2),
    })),
  };

  const randomString = crypto.randomUUID();
  const payload = JSON.stringify(body);
  const auth = await iyzicoAuthHeader(randomString, payload);

  const res = await fetch(`${IYZICO_BASE}/payment/iyzipos/initialize3ds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-iyzi-rnd': randomString,
      Authorization: auth,
    },
    body: payload,
  });

  const json = (await res.json()) as {
    status: string;
    threeDSHtmlContent?: string;
    errorMessage?: string;
  };

  if (json.status !== 'success' || !json.threeDSHtmlContent) {
    throw new Error(json.errorMessage ?? 'iyzico 3D başlatılamadı.');
  }

  const html = atob(json.threeDSHtmlContent);
  return {
    htmlContent: html,
    conversationId: params.conversationId,
  };
}

async function iyzicoAuthHeader(randomString: string, payload: string): Promise<string> {
  const data = `${randomString}${payload}`;
  const signature = await hmacSha256Base64(IYZICO_SECRET, data);
  return `IYZWSv2 apiKey:${IYZICO_KEY}&randomKey:${randomString}&signature:${signature}`;
}

export interface GarantiInitParams {
  orderId: string;
  amount: number;
  email: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvv: string;
  ipAddress?: string;
}

export async function initGarantiThreeDs(params: GarantiInitParams) {
  const amountKurus = Math.round(params.amount * 100).toString();
  // Garanti orderid tiresiz olmalı (resmi örnek: 32 hex). Webhook UUID'yi geri kurar.
  const orderId = params.orderId.replace(/-/g, '');
  const installmentCount = '';
  const txnType = 'sales';
  const currencyCode = '949';
  const successUrl = `${PUBLIC_URL}/functions/v1/garanti-webhook`;
  const errorUrl = `${PUBLIC_URL}/functions/v1/garanti-webhook`;

  // securityData = SHA1(provPwd + terminalId.padStart(9,'0')) — BÜYÜK hex.
  const securityData = await sha1Hex(GARANTI_PROVISION_PWD + GARANTI_TERMINAL_ID.padStart(9, '0'));
  // secure3dhash = SHA512(terminalid+orderid+amount+currency+successurl+errorurl
  //   +type+installment+storekey+securitydata) — BÜYÜK hex.
  const hashData = await sha512Hex(
    GARANTI_TERMINAL_ID +
      orderId +
      amountKurus +
      currencyCode +
      successUrl +
      errorUrl +
      txnType +
      installmentCount +
      GARANTI_STORE_KEY +
      securityData,
  );

  return {
    formAction: GARANTI_3D_URL,
    fields: {
      mode: GARANTI_MODE,
      apiversion: 'v0.01',
      terminalprovuserid: GARANTI_PROV_USER_ID,
      terminaluserid: GARANTI_PROV_USER_ID,
      terminalmerchantid: GARANTI_MERCHANT_ID,
      terminalid: GARANTI_TERMINAL_ID,
      txntype: txnType,
      txnamount: amountKurus,
      txncurrencycode: currencyCode,
      txninstallmentcount: installmentCount,
      orderid: orderId,
      successurl: successUrl,
      errorurl: errorUrl,
      customeremailaddress: params.email,
      customeripaddress: params.ipAddress ?? '127.0.0.1',
      secure3dsecuritylevel: '3D',
      secure3dhash: hashData,
      cardnumber: params.cardNumber.replace(/\s+/g, ''),
      cardexpiredatemonth: params.expireMonth,
      cardexpiredateyear: params.expireYear,
      cardcvv2: params.cvv,
    },
  };
}

/**
 * Garanti 3D callback doğrulaması. Banka `hashparams` (alan adları, ':' ayraçlı)
 * + `hash` (SHA512) gönderir. O alanların değerlerini sırayla birleştirip storeKey
 * ekler ve SHA512'sini karşılaştırırız. Sürüm farkları için base64 + büyük-hex'i
 * de kabul ederiz (ikisi de storeKey bilmeyi gerektirir, güvenli).
 */
export async function verifyGarantiCallback(form: Record<string, string>): Promise<boolean> {
  const receivedHash = form.hash ?? '';
  const hashParams = form.hashparams ?? '';
  if (!receivedHash || !hashParams) return false;

  let toHash = '';
  for (const key of hashParams.split(':')) {
    if (key) toHash += form[key] ?? '';
  }
  toHash += GARANTI_STORE_KEY;

  const calcBase64 = await sha512Base64(toHash);
  if (calcBase64 === receivedHash) return true;
  const calcHex = await sha512Hex(toHash);
  return calcHex === receivedHash.toUpperCase();
}
