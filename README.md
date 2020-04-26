# NodeBB Cookie Auto Login

A single sign on (SSO) plugin for nodeBB that logs the user in based on CB session

Clone from <https://www.npmjs.com/package/nodebb-plugin-cookie-auto-login> (old github repo was removed)

NodeBB Plugin that allows users to login to forum automatically, if they are logged into main site already.
This plugin works by sharring cookies across all subdomains of a main domain. On page load, this plugin makes an API call with cookies to main server. The cookies allows the main server to recognize the user & user data is returned.

Using the returned data, nodebb creates an user if not created already & logs in automatically.

## install Nodebb plugin

```bash
cd /work/
git clone https://github.com/wuliupo/nodebb-plugin-cookie-auto-login.git
cd nodebb-plugin-cookie-auto-login
npm link
```

## install Nodebb from plugin development

```bash
cd /work/
git clone https://github.com/NodeBB/NodeBB.git
cd NodeBB
export SHARP_DIST_BASE_URL="https://npm.taobao.org/mirrors/sharp-libvips/v8.8.1/" && npm install
npm link nodebb-plugin-cookie-auto-login
./nodebb -d start
```

## How to Adapt

1. Change the url to get user data at line 54.
2. That's it

## Trouble?

Find us on [the community forums](http://community.nodebb.org)!

## Document

- <https://docs.nodebb.org/>
- <https://github.com/NodeBB/NodeBB/wiki/Hooks>

## add costom style via admin page (/admin/appearance/customise)

admin -> appearance -> custom css
