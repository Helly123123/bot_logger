const jwt = require("jsonwebtoken");

/**
 * РђСЃРёРЅС…СЂРѕРЅРЅРѕ РґРµРєРѕРґРёСЂСѓРµС‚ JWT С‚РѕРєРµРЅ Рё РІРѕР·РІСЂР°С‰Р°РµС‚ user_id
 * @param {string} token - JWT С‚РѕРєРµРЅ
 * @returns {Promise<{success: boolean, user_id?: string, error?: string}>}
 */
const decodeJwtAndGetUserId = async (token) => {
  const secret =
    "MFjuiKA2hGwY0ia97pcirb1POrHBJoF1D2mTprbGNNoJoQw9tn3JbILOQom88qpxpebDPo07pLcbvTCy7YUrTvviAQH0aublhuwgBH43YqYL6pq4cEhCrCsKosUnE2U6UVbwZiOyVn4ZHthzSP2vFvlz3k8bqoNkp7ab4h1TnS4QAWhakYs6h6TcOWXtHDYt3XWz14Twuh58auRbwIYa0aIR9AmlGPPaYpy0HfaoIHzRbCwkq8kmWeAPxBoyTx4L";

  return new Promise((resolve) => {
    try {
      if (!token || typeof token !== "string") {
        throw new Error("РўРѕРєРµРЅ РЅРµ РїСЂРµРґРѕСЃС‚Р°РІР»РµРЅ");
      }

      // РСЃРїРѕР»СЊР·СѓРµРј verify СЃ РєРѕР»Р±СЌРєРѕРј РґР»СЏ Р°СЃРёРЅС…СЂРѕРЅРЅРѕР№ РѕР±СЂР°Р±РѕС‚РєРё
      jwt.verify(token, secret, { algorithms: ["HS256"] }, (err, decoded) => {
        if (err) {
          throw err;
        }

        if (!decoded.user_id) {
          throw new Error("РўРѕРєРµРЅ РЅРµ СЃРѕРґРµСЂР¶РёС‚ user_id");
        }

        console.log(decoded, "decoded");

        resolve({
          success: true,
          user_id: decoded.user_id,
          email: decoded.email,
          brand_slug: decoded.brand_slug,
        });
      });
    } catch (error) {
      let errorMessage;
      if (error.name === "TokenExpiredError") {
        errorMessage = "РўРѕРєРµРЅ РїСЂРѕСЃСЂРѕС‡РµРЅ";
      } else if (error.name === "JsonWebTokenError") {
        errorMessage = "РќРµРІРµСЂРЅС‹Р№ С‚РѕРєРµРЅ РёР»Рё РїРѕРґРїРёСЃСЊ";
      } else {
        errorMessage = error.message;
      }

      resolve({
        success: false,
        error: errorMessage,
      });
    }
  });
};

module.exports = { decodeJwtAndGetUserId };
