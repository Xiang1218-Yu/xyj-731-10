/**
 * Notes: 用户中心模块控制器
 * Date: 2021-03-15 19:20:00 
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 */

const BaseProjectController = require('./base_project_controller.js');
const MyService = require('../service/my_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');

class MyController extends BaseProjectController {

	/** 我的数据统计（功能点：我的页面数据统计卡片） */
	async getMyDataStat() {
		let service = new MyService();
		return await service.getMyDataStat(this._userId);
	}

	/** 我的站内通知列表（功能点：站内通知中心） */
	async getMyNoticeList() {

		// 数据校验
		let rules = {
			search: 'string|min:1|max:30|name=搜索条件',
			sortType: 'string|name=搜索类型',
			sortVal: 'name=搜索类型值',
			orderBy: 'object|name=排序',
			page: 'must|int|default=1',
			size: 'int',
			isTotal: 'bool',
			oldTotal: 'int',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MyService();
		let result = await service.getMyNoticeList(this._userId, input);

		// 数据格式化：通知时间转可读格式
		let list = result.list;
		for (let k = 0; k < list.length; k++) {
			list[k].NOTICE_ADD_TIME = timeUtil.timestamp2Time(list[k].NOTICE_ADD_TIME, 'Y-M-D h:m');
		}
		result.list = list;

		return result;
	}

	/** 我的未读通知数（功能点：我的页面通知入口角标） */
	async getMyNoticeCnt() {
		let service = new MyService();
		return await service.getMyNoticeCnt(this._userId);
	}

	/** 标记某条通知已读（仅能操作本人的通知） */
	async readMyNotice() {

		// 数据校验
		let rules = {
			noticeId: 'id|must',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new MyService();
		return await service.readMyNotice(this._userId, input.noticeId);
	}

}

module.exports = MyController;