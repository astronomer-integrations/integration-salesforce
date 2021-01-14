const integration = require('segmentio-integration');

// Stores the authorization bearer obtained with OAuth
// Maybe should be a map, if there's a single instance running for all writekeys
let authorization = null;

/**
 * Create `Salesforce`
 */

const Salesforce = integration('Salesforce')
  .endpoint('https://na1.salesforce.com/')
  .channels(['server'])
  .ensure('settings.clientId')
  .ensure('settings.clientSecret')
  .ensure('settings.username')
  .ensure('settings.password')
  // .ensure('settings.authorization')
  .retries(2);

/**
 * Send an identify call.
 *
 * @param {Object} payload
 * @param {Function} fn
 */
function identify(payload, fn) {
  return this.trackEvents(this.settings.events.identify, payload, fn);
}

function track(payload, fn) {
  return this.trackEvents(this.settings.events.track, payload, fn);
}

function trackEvents(events, payload, fn) {
  return this.getAuthorization().then((bearer) => {
    var promises = [];
    var formData = {};

    // Apply map settings
    events.forEach(action => {
      const sfObjectName = action.salesforce_object
      Object.entries(action.map).forEach(val => {
        const mrKey = val[0];
        const sfKey = val[1];
        formData[sfKey] = payload.proxy(`${mrKey}`);
      });

      const req = this.post(`services/data/v42.0/sobjects/${sfObjectName}`)
        .set('Authorization', `Bearer ${bearer}`)
        .set('Content-type', 'application/json')
        .send(formData);

      const promise = this.send(req);
      promises.push(promise);
    });

    Promise.all(promises)
      .then(values => {
        if (values.length > 0) {
          fn(null, values[values.length - 1]);
          return;
        }
        fn(null, null);
      })
      .catch(result => {
        const res = result.res;
        try {
          const errors = JSON.parse(res.text);
          if (errors.length > 0) {
            const { errorCode } = errors[0];
            if (errorCode) {
              if (errorCode === 'INVALID_SESSION_ID') {
                authorization = null;
                this.identify(payload, fn);
                return;
              }
              fn(this.error(errorCode));
            }
          }
        } catch (error) {
          fn(error);
        }
      });
  }).catch((error) => {
    if (error.response.body.error_description) {
      fn(this.error(error.response.body.error_description));
    } else {
      fn(error);
    }
  });
}

/**
 * Send the specified data to the specified URL
 * 
 * @param {String} url
 * @param {Object} formData
 * @param {Function} fn
 */
function send(req) {
  return new Promise((resolve, reject) => {
    req.end(this.handle((err, res) => {
      if (err) {
        reject({res: res, err: err});
        return;
      }
      resolve({res: res, err: null});
    }));
  });
}

/**
 * Retrieve the authentication bearer
 */
function getAuthorization() {
  if (authorization != null) {
    return new Promise((resolve) => {
      resolve(authorization);
    });
  }

  return new Promise((resolve, reject) => {
    this.post('services/oauth2/token')
      .type('form')
      .send({ grant_type: 'password' })
      .send({ client_id: this.settings.clientId })
      .send({ client_secret: this.settings.clientSecret })
      .send({ username: this.settings.username })
      .send({ password: this.settings.password })
      .then((res) => {
        authorization = res.body.access_token;
        resolve(authorization);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

Salesforce.prototype.getAuthorization = getAuthorization;
Salesforce.prototype.trackEvents = trackEvents;
Salesforce.prototype.identify = identify;
Salesforce.prototype.track = track;
Salesforce.prototype.send = send;

module.exports = Salesforce;
