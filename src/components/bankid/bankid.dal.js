/* eslint-disable default-case */
/* eslint-disable no-undef */
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const config = require('config');

const BANKID_API_URL = config.get('BANKID.API_URL');
const BANKID_CA = config.get('BANKID.CA');
const BANKID_PFX_PATH = config.get('BANKID.PFX_PATH');
const BANKID_PASSPHRASE = config.get('BANKID.PASSPHRASE');

const client = axios.create({
  httpsAgent: new https.Agent({
    ca: BANKID_CA,
    pfx: fs.readFileSync(BANKID_PFX_PATH),
    passphrase: BANKID_PASSPHRASE,
    rejectUnauthorized: false,
  }),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});
// Wrapper for all calls to bankId
const call = (path, payload) => {
  return client.post(BANKID_API_URL + path, payload)
    .then((response) => {
      return response.status === 200
        ? {
          status: response.status,
          data: response.data,
        }
        : {
          status: response.status,
          message: response.data.details,
          errorCode: response.data.errorCode,
        };
    })
    .catch((error) => {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      // console.log('error.data', error.response.data);
      // console.log('error.status', error.response.status);
      // console.log('error.headers', error.response.headers);
      if (error.response) return error.response;

      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      if (error.request) console.log(error.request);
      else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
      console.log(error.config);
    });
};

const collectUntilDone = (orderRef) => {
  return new Promise((resolve, reject) => {
    let counter = 0;
    const timer = setInterval(async () => {
      try {
        counter++;
        // 5min limit
        if (counter === 150) {
          clearInterval(timer);
        }
        const collectResponse = await call('/collect', {
          orderRef,
        });
        switch (collectResponse.data.status) {
          case 'complete':
            clearInterval(timer);
            return resolve(collectResponse);
          case 'failed' :
            clearInterval(timer);
            return resolve(collectResponse.hintCode);
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, 2000);
  });
};

// Authentication call with Bank Id
const auth = async (endUserIp, personalNumber) => {
  try {
    if (!endUserIp) {
      return {
        status: 400,
        message: 'Missing required arguments: endUserIp.',
        errorCode: 'invalidParameters',
      };
    }

    return await call('/auth', {
      endUserIp,
      personalNumber
    });
  } catch (error) {
    console.log('error', error);
  }
};

// Signature call with Bank Id
const sign = async (endUserIp, personalNumber, userVisibleData) => {
  try {
    if (!endUserIp) {
      return {
        status: 400,
        message: 'Missing required arguments: endUserIp.',
        errorCode: 'invalidParameters',
      };
    }

    return await call('/sign', {
      personalNumber: personalNumber.toString(),
      endUserIp: endUserIp.toString(),
      userVisibleData: userVisibleData
        ? Buffer.from(userVisibleData).toString('base64')
        : undefined,
    });
  } catch (error) {
    console.log('error', error);
  }
};

// Collect call with Bank Id
const collect = async (orderRef) => {
  try {
    if (!orderRef) {
      return {
        status: 400,
        message: 'Missing required arguments: orderRef.',
        errorCode: 'invalidParameters',
      };
    }

    return await call('/collect', {
      orderRef,
    });
  } catch (error) {
    console.log('error', error);
  }
};


// Cancel call with Bank Id
const cancel = async (orderRef) => {
  try {
    if (!orderRef) {
      return {
        status: 400,
        message: 'Missing required arguments: orderRef.',
        errorCode: 'invalidParameters',
      };
    }

    return await call('/cancel', {
      orderRef,
    });
  } catch (error) {
    console.log('error', error);
  }
};

// Signature and Status Collection call from Bank Id
const signAndCollect = async (endUserIp, personalNumber, userVisibleData) => {
  try {
    if (!endUserIp) {
      return {
        status: 400,
        message: 'Missing required arguments: endUserIp.',
        errorCode: 'invalidParameters',
      };
    }

    const signingResponse = await call('/sign', {
      personalNumber: personalNumber.toString(),
      endUserIp: endUserIp.toString(),
      userVisibleData: userVisibleData
        ? Buffer.from(userVisibleData).toString('base64')
        : undefined,
    });

    if (signingResponse.status !== 200) return response;

    return collectUntilDone(signingResponse.data.orderRef);
  } catch (error) {
    console.log('error', error);
  }
};

// Authenticate and Status Collection call from Bank Id
const authAndCollect = async (endUserIp) => {
  try {
    if (!endUserIp) {
      return {
        status: 400,
        message: 'Missing required arguments: endUserIp.',
        errorCode: 'invalidParameters',
      };
    }

    const authenticationResponse = await call('/auth', {endUserIp: endUserIp.toString()});

    if (authenticationResponse.status !== 200) return response;

    return collectUntilDone(authenticationResponse.data.orderRef);
  } catch (error) {
    console.log('error', error);
  }
};

module.exports = {
  auth,
  sign,
  collect,
  cancel,
  signAndCollect,
  authAndCollect,
};