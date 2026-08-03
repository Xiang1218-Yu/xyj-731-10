/**
 * Notes: 云初始化实例
 * Ver : CCMiniCloud Framework 2.2.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2020-09-05 04:00:00 
 */

const config = require('../../config/config.js');

/**
 * 获得云实例
 */
function getCloud() {
	const cloud = require('wx-server-sdk');
	cloud.init({
		env: config.CLOUD_ID
	});
	return cloud;
}

/**
 * 执行数据库事务
 * 注意：事务内只能对通过 transaction.collection() 取得的集合引用来做增删改查，
 * 不能混用 Model 的静态方法（那些走的是普通 db 连接）。
 * @param {Function} callback 异步函数，接收 transaction 参数，返回值将作为事务结果
 * @returns {Promise<*>} callback 的返回值
 */
async function runTransaction(callback) {
	const cloud = getCloud();
	const db = cloud.database();
	return await db.runTransaction(async transaction => {
		return await callback(transaction);
	});
}

/**
 * 发送订阅消息
 * @param {string} touser 接收者openid
 * @param {string} templateId 模板ID
 * @param {object} data 模板内容
 * @param {string} page 点击跳转页面
 */
async function sendSubscribeMessage(touser, templateId, data, page) {
	if (!touser || !templateId) return null;

	const cloud = getCloud();
	let params = {
		touser,
		templateId,
		data
	};
	if (page) params.page = page;

	return await cloud.openapi.subscribeMessage.send(params);
}

module.exports = {
	getCloud,
	runTransaction,
	sendSubscribeMessage
}