/**
 * Notes: 用户中心模块控制器
 * Date: 2021-03-15 19:20:00 
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 */

const BaseProjectController = require('./base_project_controller.js');
const MyService = require('../service/my_service.js');

class MyController extends BaseProjectController { 

	/** 我的可视化数据统计 */
	async getMyStat() {
		let service = new MyService();
		return await service.getMyStat(this._userId);
	}

}

module.exports = MyController;
