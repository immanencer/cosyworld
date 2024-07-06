import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import qs from 'querystring';

const consumer_key = process.env.TWITTER_CLIENT_ID;
const consumer_secret = process.env.TWITTER_CLIENT_SECRET;

const oauth = OAuth({
  consumer: {
    key: consumer_key,
    secret: consumer_secret
  },
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
});

const requestTokenURL = 'https://api.twitter.com/oauth/request_token?oauth_callback=http://localhost:3000/twitter/callback&x_auth_access_type=write';
const authorizeURL = new URL('https://api.twitter.com/oauth/authorize');
const accessTokenURL = 'https://api.twitter.com/oauth/access_token';

async function requestToken() {
  const authHeader = oauth.toHeader(oauth.authorize({
    url: requestTokenURL,
    method: 'POST'
  }));

  const response = await fetch(requestTokenURL, {
    method: 'POST',
    headers: {
      Authorization: authHeader["Authorization"]
    }
  });

  if (response.ok) {
    const body = await response.text();
    return qs.parse(body);
  } else {
    throw new Error('Cannot get an OAuth request token');
  }
}

async function accessToken({ oauth_token, oauth_token_secret }, verifier) {
  const authHeader = oauth.toHeader(oauth.authorize({
    url: accessTokenURL,
    method: 'POST'
  }));
  const path = `https://api.twitter.com/oauth/access_token?oauth_verifier=${verifier}&oauth_token=${oauth_token}`;

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: authHeader["Authorization"]
    }
  });

  if (response.ok) {
    const body = await response.text();
    return qs.parse(body);
  } else {
    throw new Error('Cannot get an OAuth access token');
  }
}

async function tweet(oauthAccessToken, text) {
  const client = new TwitterApi({
    appKey: consumer_key,
    appSecret: consumer_secret,
    accessToken: oauthAccessToken.oauth_token,
    accessSecret: oauthAccessToken.oauth_token_secret
  });

  const rwClient = client.readWrite;
  return await rwClient.v2.tweet(text);
}

export { requestToken, accessToken, tweet, authorizeURL };
