/**
 * Notes: 打卡模块控制器
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2022-06-23 04:00:00 
 */

const BaseProjectController = require('./base_project_controller.js');
const EnrollService = require('../service/enroll_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const contentCheck = require('../../../framework/validate/content_check.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');
const dataUtil = require('../../../framework/utils/data_util.js');

class EnrollController extends BaseProjectController {

	_getTimeShow(start, end) {
		let startDay = timeUtil.timestamp2Time(start, 'Y-M-D');
		let startTime = timeUtil.timestamp2Time(start, 'h:m');
		let week = timeUtil.week(timeUtil.timestamp2Time(start, 'Y-M-D'));
		week = '';

		if (end) {
			let endDay = timeUtil.timestamp2Time(end, 'M月D日');
			let endTime = timeUtil.timestamp2Time(end, 'h:m');

			if (startDay != endDay)
				return `${startDay} ${startTime} ${week}～${endDay} ${endTime}`;
			else
				return `${startDay} ${startTime}～${endTime} ${week}`;
		}
		else
			return `${startDay} ${startTime} ${week}`;
	}

	/** 列表 */
	async getEnrollList() {

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

		let service = new EnrollService();
		let result = await service.getEnrollList(input);

		// 数据格式化
		let list = result.list;

		for (let k = 0; k < list.length; k++) {
			list[k].start = this._getTimeShow(list[k].ENROLL_START);
			list[k].end = this._getTimeShow(list[k].ENROLL_END);
			list[k].statusDesc = service.getJoinStatusDesc(list[k]);

			if (list[k].ENROLL_OBJ && list[k].ENROLL_OBJ.content)
				delete list[k].ENROLL_OBJ.content;
		}

		return result;

	}


	/** 浏览详细 */
	async viewEnroll() {
		// 数据校验
		let rules = {
			id: 'must|id',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new EnrollService();
		let enroll = await service.viewEnroll(this._userId, input.id);

		if (enroll) {
			enroll.start = this._getTimeShow(enroll.ENROLL_START);
			enroll.end = this._getTimeShow(enroll.ENROLL_END);
			enroll.statusDesc = service.getJoinStatusDesc(enroll);

			if (enroll.ENROLL_DAYS) delete enroll.ENROLL_DAYS;

		}

		return enroll;
	}

	async getEnrollJoinByDay() {
		// 数据校验
		let rules = {
            enrollId: 'must|id',
			day: 'string',

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

		let service = new EnrollService();
        let result = await service.getEnrollJoinByDay(input);


        // 数据格式化
        let list = result.list;


        for (let k = 0; k < list.length; k++) {
            list[k].ENROLL_JOIN_ADD_TIME = timeUtil.timestamp2Time(list[k].ENROLL_JOIN_ADD_TIME, 'Y-M-D h:m');
        }

        result.list = list;

        return result;
	}


	/** 我的打卡列表 */
	async getMyEnrollUserList() {

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

		let service = new EnrollService();
		let result = await service.getMyEnrollUserList(this._userId, input);

		// 数据格式化
		let list = result.list;


		for (let k = 0; k < list.length; k++) {
			if (list[k].enroll.ENROLL_DAY_CNT <= 0) list[k].enroll.ENROLL_DAY_CNT = 1;
			list[k].per = Math.round(Number((list[k].ENROLL_USER_JOIN_CNT * 100) / list[k].enroll.ENROLL_DAY_CNT)); 
		}

		result.list = list;

		return result;

	}

	/** 我的打卡清单列表 */
	async getMyEnrollJoinList() {

		// 数据校验
		let rules = {
			enrollId: 'string|must',
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

		let service = new EnrollService();
		let result = await service.getMyEnrollJoinList(this._userId, input);

		// 数据格式化
		let list = result.list;


		for (let k = 0; k < list.length; k++) {
            list[k].ENROLL_JOIN_ADD_TIME = timeUtil.timestamp2Time(list[k].ENROLL_JOIN_ADD_TIME, 'Y-M-D h:m');
		}

		result.list = list;

		return result;

	}

    async cancelMyEnrollJoin() {
        // 数据校验
        let rules = {
            enrollId: 'string|must',
        };

        // 取得数据
        let input = this.validateData(rules);

        let service = new EnrollService();
        return await service.cancelMyEnrollJoin(this._userId, input.enrollId);
    }

	/** 打卡提交 */
	async enrollJoin() {
		// 数据校验
		let rules = {
			enrollId: 'must|id',
            forms: 'array|name=表单',
            pics: 'array|name=打卡图片',
            voice: 'object|name=语音',
            location: 'object|name=位置',
		};

		// 取得数据
		let input = this.validateData(rules);

		let service = new EnrollService();
		return await service.enrollJoin(this._userId, input.enrollId, input.forms, input.pics, input.voice, input.location);
	}


    /** 更新图片信息 */
    async updateJoinForms() {

        // 数据校验
        let rules = {
            id: 'must|id',
            hasImageForms: 'array'
        };

        // 取得数据
        let input = this.validateData(rules);

        // 内容审核
        await contentCheck.checkTextMultiClient(input);

        let service = new EnrollService();
        return await service.updateJoinForms(input);
    }

	/**
	 * 上传打卡语音（通过云函数上传，绕过前端直连云存储的权限限制）
	 * 前端将录音文件读取为 base64 传入，云函数以管理员身份写入云存储。
	 */
	async uploadVoice() {
		// 数据校验：cloudPath 为云存储路径，voiceBase64 为不含 data:audio/mp3;base64, 前缀的纯 base64
		let rules = {
			cloudPath: 'must|string|name=存储路径',
			voiceBase64: 'must|string|name=语音数据'
		};
		let input = this.validateData(rules);

		// 限制 base64 大小（约 2MB，按 base64 膨胀系数 1.37 估算）
		if (input.voiceBase64.length > 2 * 1024 * 1024 * 1.4) {
			this.AppError('语音文件过大，请控制在 2MB 以内（约 60 秒）');
		}

		const cloud = cloudBase.getCloud();
		// base64 转 buffer
		let fileContent = Buffer.from(input.voiceBase64, 'base64');

		let upload = await cloud.uploadFile({
			cloudPath: input.cloudPath,
			fileContent
		});

		return {
			fileID: upload.fileID
		};
	}

}

module.exports = EnrollController;