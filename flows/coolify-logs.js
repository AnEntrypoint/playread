module.exports = async function(client, baseUrl, targetDomain, email, password) {
  if (!baseUrl || !targetDomain || !email || !password) {
    throw new Error('Usage: coolify-logs <baseUrl> <targetDomain> <email> <password>');
  }

  const domainMap = {
    'playread.247420.xyz': {
      proj: 'pwg404wcsw0g0ks40w4skogw',
      env: 'e4s4ccs0okc4oscgssgcsgwk',
      app: 'n8c8osc4cok4w0kwk8c4kc0k'
    },
    'schwepe.247420.xyz': {
      proj: 'd8w404kwwcw04og4ks844ckg',
      env: 'ckgocgs0044ckcsgogkccw88',
      app: 'c0s8g4k00oss8kkcoccs88g0'
    }
  };

  const ids = domainMap[targetDomain];
  if (!ids) {
    throw new Error(`Unknown domain mapping: ${targetDomain}`);
  }

  const deployUrl = `${baseUrl}/project/${ids.proj}/environment/${ids.env}/application/${ids.app}/deployment`;
  await client.navigate(deployUrl);
  await client.waitFor(null, null, 3);

  const firstLogLinkResp = await client.evaluate(`() => {
    const links = Array.from(document.querySelectorAll('a[href*="/deployment/"]'));
    return links.length > 0 ? links[0].href : null;
  }`);

  let firstLogLink = null;
  const respStr = JSON.stringify(firstLogLinkResp);

  if (respStr.includes('/deployment/')) {
    const match = respStr.match(/(https:\/\/[^"]+\/deployment\/[a-z0-9]+)/);
    if (match) firstLogLink = match[1];
  }

  if (!firstLogLink) {
    throw new Error(`No deployment logs found - response: ${respStr.substring(0, 200)}`);
  }

  await client.navigate(firstLogLink);
  await client.waitFor(null, null, 5);

  const logsResp = await client.evaluate(`() => {
    const allText = document.body.innerText;
    const logStart = allText.indexOf('Starting deployment');
    if (logStart === -1) {
      return [];
    }
    const logText = allText.substring(logStart);
    return logText.split('\\n').filter(l => l.trim().length > 0);
  }`);

  let logArray = [];
  if (logsResp.content?.[0]?.text) {
    try {
      logArray = JSON.parse(logsResp.content[0].text);
    } catch (e) {
      logArray = logsResp.content[0].text.split('\n').filter(line => line.trim());
    }
  } else if (typeof logsResp === 'string') {
    const lines = logsResp.split('\n');
    const jsonLine = lines.find(line => line.startsWith('[') || line.startsWith('{'));
    if (jsonLine) {
      try {
        logArray = JSON.parse(jsonLine);
      } catch (e) {
        logArray = lines.filter(line => line.trim() && !line.startsWith('###'));
      }
    } else {
      logArray = lines.filter(line => line.trim() && !line.startsWith('###'));
    }
  } else if (Array.isArray(logsResp)) {
    logArray = logsResp;
  }

  await client.close();

  return JSON.stringify(logArray, null, 2);
};
