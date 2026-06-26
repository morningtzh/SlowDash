// SDKs required dynamically to prevent crashes before npm install finishes

module.exports = async function(config) {
  if (config.galleryMode && !config.deepseek_key && !config.aliyun_access_key) return { deepseek: "1024.50", aliyun: "88.00" };
  
  let deepseek = "0.00";
  let aliyun = "0.00";
  
  if (config.deepseek_key) {
    try {
      const res = await fetch('https://api.deepseek.com/user/balance', {
        headers: { 'Authorization': `Bearer ${config.deepseek_key}` }
      });
      const data = await res.json();
      if (data.is_available) {
        deepseek = data.balance_infos?.[0]?.total_balance || "0.00";
      }
    } catch (e) {
      deepseek = "Error";
    }
  }

  if (config.aliyun_access_key && config.aliyun_secret_key) {
    try {
      const BssOpenApi = require('@alicloud/bssopenapi20171214');
      const OpenApi = require('@alicloud/openapi-client');
      const clientConfig = new OpenApi.Config({
        accessKeyId: config.aliyun_access_key,
        accessKeySecret: config.aliyun_secret_key,
        endpoint: 'business.aliyuncs.com'
      });
      const client = new BssOpenApi.default(clientConfig);
      const response = await client.queryAccountBalance();
      if (response && response.body && response.body.data) {
        aliyun = response.body.data.availableAmount;
      } else {
        aliyun = "Err Data";
      }
    } catch(e) {
      console.error("Aliyun API Error:", e.message);
      aliyun = "Key/Auth Err";
    }
  }

  return { deepseek, aliyun };
};

module.exports.supportedSizes = ['2x2', '4x2'];
