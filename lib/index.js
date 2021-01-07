
const integration = require('segmentio-integration');

// Stores the authorization bearer obtained with OAuth
// Maybe should be a map, if there's a single instance running for all writekeys
var authorization = null;

/**
 * Create `Salesforce`
 */

const Salesforce = integration('Salesforce')
  .endpoint('https://na1.salesforce.com/')
  .channels(['server', 'mobile'])
  .ensure('settings.clientId')
  .ensure('settings.clientSecret')
  .ensure('settings.username')
  .ensure('settings.password')
  //.ensure('settings.authorization')
  .retries(2);

/**
 * Send an identify call.
 *
 * @param {Object} payload
 * @param {Function} fn
 */
function identify(payload, fn) {
  return this.getAuthorization().then(bearer => {
    const formdata = {
      "Company": payload.companyName(),
      "Email": payload.email(),
      "FirstName": payload.firstName(),
      "LastName": payload.lastName()
    };
    const req = this.post('services/data/v42.0/sobjects/Lead')
    .set('Authorization', `Bearer ${bearer}`)
    .set('Content-type', 'application/json')
    .send(formdata);

    req.end(this.handle((err, res) => {
      if (err) {
        try {
          const response = JSON.parse(res.text);
          if (response.message) {
            fn(this.error(response.message));
          }
        } catch (error) {
          fn(error);
        }
        return;
      }
      fn(null, res);
    }));
  });
}

function getAuthorization() {
  if (authorization != null) {
    return new Promise(resolve => {
      resolve(authorization);
    });
  }

  return new Promise(resolve => {
    const req = this.post('services/oauth2/token')
    .type('form')
    .send({'grant_type': 'password'})
    .send({'client_id': this.settings.clientId})
    .send({'client_secret': this.settings.clientSecret})
    .send({'username': this.settings.username})
    .send({'password': this.settings.password})
    .then(res => {
      resolve(res.body.access_token);
    })
    .catch(error => {
      console.log('Salesforce: auth token fetch error', error)
    });
  });
}

Salesforce.prototype.identify = identify;
Salesforce.prototype.getAuthorization = getAuthorization;

module.exports = Salesforce;