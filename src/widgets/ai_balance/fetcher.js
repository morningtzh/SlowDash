// SDKs required dynamically to prevent crashes before npm install finishes

const { fetchWithRetry } = require('../../retryFetch');

module.exports = async function(config) {
  const balances = [];
  
  if (config.galleryMode && !config.deepseek_key && !config.aliyun_access_key) {
    balances.push({ name: "DeepSeek", balance: "1024.50", currency: "¥" });
    balances.push({ name: "Aliyun", balance: "88.00", currency: "¥" });
    return { type: config.type || 'balance', balances };
  }
  
  if (config.deepseek_key) {
    try {
      const res = await fetchWithRetry('https://api.deepseek.com/user/balance', {
        headers: { 'Authorization': `Bearer ${config.deepseek_key}` },
        signal: AbortSignal.timeout(10000)
      });
      const data = await res.json();
      if (data.is_available) {
        balances.push({ name: "DeepSeek", balance: data.balance_infos?.[0]?.total_balance || "0.00", currency: "¥" });
      }
    } catch (e) {
      balances.push({ name: "DeepSeek", balance: "Error", currency: "¥" });
    }
  }

  if (config.aliyun_access_key && config.aliyun_secret_key) {
    try {
      const BssOpenApi = require('@alicloud/bssopenapi20171214');
      const OpenApi = require('@alicloud/openapi-client');
      const clientConfig = new OpenApi.Config({
        accessKeyId: config.aliyun_access_key,
        accessKeySecret: config.aliyun_secret_key,
        endpoint: 'business.aliyuncs.com',
        readTimeout: 10000,
        connectTimeout: 10000
      });
      const client = new BssOpenApi.default(clientConfig);
      const response = await client.queryAccountBalance();
      if (response && response.body && response.body.data) {
        balances.push({ name: "Aliyun", balance: response.body.data.availableAmount, currency: "¥" });
      } else {
        balances.push({ name: "Aliyun", balance: "Err", currency: "¥" });
      }
    } catch(e) {
      console.error("Aliyun API Error:", e.message);
      balances.push({ name: "Aliyun", balance: "Auth Err", currency: "¥" });
    }
  }

  return { type: config.type || 'balance', balances };
};

module.exports.supportedSizes = ['1x1', '2x1', '3x1', '2x2'];
module.exports.galleryVariants = [
  { size: '2x2', type: 'balance' },
  { size: '3x1', type: 'balance' },
  { size: '2x1', type: 'balance' },
  { size: '1x1', type: 'compact' }
];
