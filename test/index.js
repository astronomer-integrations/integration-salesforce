const Test = require('segmentio-integration-tester');
const faker = require('faker');
const Salesforce = require('..');

describe('Salesforce', () => {
  beforeEach(() => {
    settings = {
      "clientId": "3MVG98hdjyNB1QTlnja1yQDO.Hr7idXRUheY0vNfz41r6.54HP5jjyKaqjfFZ7bIfpdF6C8CNHUbDepdtNfKu",
      "clientSecret": "0E483E670FC69735380284A44894B72076179AC1F14C9E063408F7D65C2A7DD9",
      "username": "test@metarouter.io",
      "password": "m3t4r0uter",
      "events": {
      	"identify": [
      		{
            "salesforce_object": "Lead",
            "event_name": null,
	      		"map": {
              "firstName": "FirstName",
              "lastName": "LastName",
	      			"email": "Email",
	      			"traits.company.name": "Company"
	      		}
	      	}
        ],
        "track": [
          {
            "salesforce_object": "Contact",
            "event_name": "Sign Up",
	      		"map": {
              "properties.firstName": "FirstName",
              "properties.lastName": "LastName",
	      			"properties.email": "Email"
	      		}
	      	}
        ]
      }
    };
    fakedata = {
      type: 'identify',
      userId: 'user-id',
      event: 'my-event',
      timestamp: '2014',
      properties: { revenue: 19.99, property: true },
      traits: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.phoneNumber(),
        company: { name: 'Astronomer' },
      },
    };
    salesforce = new Salesforce(settings);
    test = Test(salesforce, __dirname);
  });

  it('should have the correct settings', () => {
    test
      .name('Salesforce')
      .channels(['server'])
      .ensure('settings.clientId')
      .ensure('settings.clientSecret')
      .ensure('settings.username')
      .ensure('settings.password');
  });

  describe('.validate()', () => {
    it('should not be valid without a client id', () => {
      test.invalid({}, { clientSecret: 'secret', username: 'username', password: 'password' });
    });

    it('should not be valid without a client secret', () => {
      test.invalid({}, { clientId: 'id', username: 'username', password: 'password' });
    });

    it('should not be valid without a username', () => {
      test.invalid({}, { clientSecret: 'secret', clientId: 'id', password: 'password' });
    });

    it('should not be valid without a password', () => {
      test.invalid({}, { clientSecret: 'secret', clientId: 'id', username: 'username' });
    });

    it('should be valid with all of the required fields above', () => {
      test.valid({}, {
        clientSecret: 'secret', clientId: 'id', username: 'username', password: 'password',
      });
    });
  });

  describe('.identify()', () => {
    it('should error on invalid creds', (done) => {
      const json = test.fixture('identify-basic');
      test
        .set({
          clientSecret: '', clientId: '', username: '', password: '',
        })
        .identify(json.input)
        .error(done);
    });

    it('should error on duplicate data', (done) => {
      const json = test.fixture('identify-basic');
      test
        .set({
          clientSecret: settings.clientSecret, clientId: settings.clientId, username: settings.username, password: settings.password,
        })
        .identify(json.input)
        .error(done);
    });

    it('should create leads when nothing else fails', (done) => {
      test
        .set({
          clientSecret: settings.clientSecret, clientId: settings.clientId, username: settings.username, password: settings.password,
        })
        .identify(fakedata)
        .requests(1)
        .expects(201, done);
    });
  });

  describe('.track()', () => {
    it('should create Contacts from Sign Up track event', (done) => {
      trackdata = {
        type: 'track',
        userId: 'user-id',
        event: 'Sign Up',
        timestamp: '2014',
        properties: {
          firstName: faker.name.firstName(),
          lastName: "Signup",
          email: faker.internet.email(),
          phone: faker.phone.phoneNumber()
        },
      }
      test
        .set({
          clientSecret: settings.clientSecret, clientId: settings.clientId, username: settings.username, password: settings.password,
        })
        .track(trackdata)
        .requests(1)
        .expects(201, done);
    });
  });
});
