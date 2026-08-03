/**
 * Notes: 打卡后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2022-06-23 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const EnrollService = require('../enroll_service.js');
const AdminHomeService = require('../admin/admin_home_service.js');
const util = require('../../../../framework/utils/util.js');
const EnrollModel = require('../../model/enroll_model.js');
const EnrollJoinModel = require('../../model/enroll_join_model.js');
const EnrollUserModel = require('../../model/enroll_user_model.js');
const cloudUtil = require('../../../../framework/cloud/cloud_util.js');
const cloudBase = require('../../../../framework/cloud/cloud_base.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const exportUtil = require('../../../../framework/utils/export_util.js');
const UserModel = require('../../model/user_model.js');

// 导出打卡数据KEY
const EXPORT_ENROLL_JOIN_DATA_KEY = 'EXPORT_ENROLL_JOIN_DATA';

class AdminEnrollService extends BaseProjectAdminService {

    // 计算日期跨度数组
    calcEnrollDays(startDay, endDay) {
        let arr = [];
        for (let k = startDay; k <= endDay;) {
            arr.push(timeUtil.timestamp2Time(k, 'Y-M-D'));
            k += 86400 * 1000;
        }
        return arr;
    }

    // 根据开始结束时间计算天数
    caclEnrollDay(start, end) {
        start = timeUtil.timestamp2Time(start, 'Y-M-D') + ' 00:00:00';
        start = timeUtil.time2Timestamp(start);

        end = timeUtil.timestamp2Time(end, 'Y-M-D') + ' 23:59:59';
        end = timeUtil.time2Timestamp(end);



        let step = (end - start) / (86400 * 1000);

        if (step <= 0) step = 1;
        step = Math.ceil(step);
        return step;
    }

    /**取得分页列表 */
    async getAdminEnrollList({
        search, // 搜索条件
        sortType, // 搜索菜单
        sortVal, // 搜索菜单
        orderBy, // 排序
        whereEx, //附加查询条件
        page,
        size,
        isTotal = true,
        oldTotal
    }) {

        orderBy = orderBy || {
            'ENROLL_ORDER': 'asc',
            'ENROLL_ADD_TIME': 'desc'
        };
        let fields = 'ENROLL_USER_CNT,ENROLL_DAY_CNT,ENROLL_TITLE,ENROLL_CATE_ID,ENROLL_CATE_NAME,ENROLL_EDIT_TIME,ENROLL_ADD_TIME,ENROLL_ORDER,ENROLL_STATUS,ENROLL_VOUCH,ENROLL_JOIN_CNT,ENROLL_START,ENROLL_END,ENROLL_QR,ENROLL_OBJ';

        let where = {};
        where.and = {
            _pid: this.getProjectId() //复杂的查询在此处标注PID
        };

        if (util.isDefined(search) && search) {
            where.or = [{
                ENROLL_TITLE: ['like', search]
            },];

        } else if (sortType && util.isDefined(sortVal)) {
            // 搜索菜单
            switch (sortType) {
                case 'cateId': {
                    where.and.ENROLL_CATE_ID = String(sortVal);
                    break;
                }
                case 'status': {
                    where.and.ENROLL_STATUS = Number(sortVal);
                    break;
                }
                case 'vouch': {
                    where.and.ENROLL_VOUCH = 1;
                    break;
                }
                case 'top': {
                    where.and.ENROLL_ORDER = 0;
                    break;
                }
                case 'sort': {
                    orderBy = this.fmtOrderBySort(sortVal, 'ENROLL_ADD_TIME');
                    break;
                }
            }
        }

        return await EnrollModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
    }

    /**置顶与排序设定 */
    async sortEnroll(id, sort) {
		sort = Number(sort);
		let data = {};
		data.ENROLL_ORDER = sort;
		await EnrollModel.edit(id, data);
    }

    /**推荐设定 */
    async vouchEnroll(id, vouch) {
		let data = { ENROLL_VOUCH: Number(vouch) };
		await EnrollModel.edit(id, data);
    }

    /**添加 */
    async insertEnroll({
        title,
        cateId,
        cateName,
        start,
        end,

        order,
        forms,
        joinForms,
    }) {

		// 时间转换
		start = timeUtil.time2Timestamp(start);
		end = timeUtil.time2Timestamp(end);

		// 计算打卡天数和日期数组
		let dayCnt = this.caclEnrollDay(start, end);
		let startDay = timeUtil.time2Timestamp(timeUtil.timestamp2Time(start, 'Y-M-D'));
		let endDay = timeUtil.time2Timestamp(timeUtil.timestamp2Time(end, 'Y-M-D'));
		let days = this.calcEnrollDays(startDay, endDay);

		// 表单处理
		let obj = dataUtil.dbForms2Obj(forms);

		let data = {
			ENROLL_TITLE: title,
			ENROLL_CATE_ID: cateId,
			ENROLL_CATE_NAME: cateName,

			ENROLL_START: start,
			ENROLL_END: end,
			ENROLL_DAY_CNT: dayCnt,
			ENROLL_DAYS: days,

			ENROLL_ORDER: order,
			ENROLL_FORMS: forms,
			ENROLL_OBJ: obj,

			ENROLL_JOIN_FORMS: joinForms,

			ENROLL_STATUS: EnrollModel.STATUS.COMM
		}

		let id = await EnrollModel.insert(data);

		// 生成二维码
		let qr = await this.genDetailQr('enroll', id);
		if (qr) {
			await EnrollModel.edit(id, { ENROLL_QR: qr });
		}

		return { id };
    }

    /**删除数据 */
    async delEnroll(id) {
		// 先获取打卡活动信息
		let enroll = await EnrollModel.getOne(id, 'ENROLL_FORMS,ENROLL_QR');
		if (!enroll) return;

		// 删除活动表单图片
		await cloudUtil.handlerCloudFilesForForms(enroll.ENROLL_FORMS, []);

		// 删除二维码
		if (enroll.ENROLL_QR) {
			await cloudUtil.deleteFiles(enroll.ENROLL_QR);
		}

		// 删除关联的打卡记录
		let whereJoin = {
			ENROLL_JOIN_ENROLL_ID: id
		}
		let joinList = await EnrollJoinModel.getAllBig(whereJoin, 'ENROLL_JOIN_FORMS', {}, 10000);
		for (let k = 0; k < joinList.length; k++) {
			await cloudUtil.handlerCloudFilesForForms(joinList[k].ENROLL_JOIN_FORMS, []);
		}
		await EnrollJoinModel.del(whereJoin);

		// 删除关联的用户统计记录
		let whereUser = {
			ENROLL_USER_ENROLL_ID: id
		}
		await EnrollUserModel.del(whereUser);

		// 删除打卡活动
		await EnrollModel.del(id);
    }

    /**获取信息 */
    async getEnrollDetail(id) {
        let fields = '*';

        let where = {
            _id: id
        }

        let enroll = await EnrollModel.getOne(where, fields);
        if (!enroll) return null;

        return enroll;
    }

    // 更新forms信息
    async updateEnrollForms({
        id,
        hasImageForms
    }) {
		// 获取旧表单
		let enroll = await EnrollModel.getOne(id, 'ENROLL_FORMS');
		if (!enroll) return;

		// 处理图片删除
		await cloudUtil.handlerCloudFilesForForms(enroll.ENROLL_FORMS, hasImageForms);

		// 更新表单
		await EnrollModel.editForms(id, 'ENROLL_FORMS', 'ENROLL_OBJ', hasImageForms);
    }


    /**更新数据 */
    async editEnroll({
        id,
        title,
        cateId, // 二级分类 
        cateName,

        start,
        end,

        order,
        forms,
        joinForms
    }) {

		// 获取旧打卡活动
		let oldEnroll = await EnrollModel.getOne(id, 'ENROLL_FORMS');
		if (!oldEnroll) return;

		// 时间转换
		start = timeUtil.time2Timestamp(start);
		end = timeUtil.time2Timestamp(end);

		// 计算打卡天数和日期数组
		let dayCnt = this.caclEnrollDay(start, end);
		let startDay = timeUtil.time2Timestamp(timeUtil.timestamp2Time(start, 'Y-M-D'));
		let endDay = timeUtil.time2Timestamp(timeUtil.timestamp2Time(end, 'Y-M-D'));
		let days = this.calcEnrollDays(startDay, endDay);

		// 处理表单图片删除
		await cloudUtil.handlerCloudFilesForForms(oldEnroll.ENROLL_FORMS, forms);

		// 表单处理
		let obj = dataUtil.dbForms2Obj(forms);

		let data = {
			ENROLL_TITLE: title,
			ENROLL_CATE_ID: cateId,
			ENROLL_CATE_NAME: cateName,

			ENROLL_START: start,
			ENROLL_END: end,
			ENROLL_DAY_CNT: dayCnt,
			ENROLL_DAYS: days,

			ENROLL_ORDER: order,
			ENROLL_FORMS: forms,
			ENROLL_OBJ: obj,

			ENROLL_JOIN_FORMS: joinForms,
		}

		await EnrollModel.edit(id, data);
    }

    /**修改状态 */
    async statusEnroll(id, status) {
        let data = { ENROLL_STATUS: Number(status) };
        await EnrollModel.edit(id, data);
    }


    //#############################
    /**打卡分页列表 */
    async getEnrollJoinList({
        search, // 搜索条件
        sortType, // 搜索菜单
        sortVal, // 搜索菜单
        orderBy, // 排序
        enrollId,
        page,
        size,
        isTotal = true,
        oldTotal
    }) {

        orderBy = orderBy || {
            'ENROLL_JOIN_ADD_TIME': 'desc'
        };
        let fields = 'ENROLL_JOIN_OBJ,ENROLL_JOIN_DAY,ENROLL_JOIN_ADD_TIME,user.USER_MOBILE,user.USER_NAME,user.USER_PIC';

        let where = {
            ENROLL_JOIN_ENROLL_ID: enrollId
        };

        if (search && search.includes('#')) {
            let arr = search.split('#');
            where.ENROLL_JOIN_DAY = ['between', arr[0], arr[1]];
        }

        if (sortType && util.isDefined(sortVal)) {
            // 搜索菜单
            switch (sortType) {
                case 'status':
                    where.ENROLL_JOIN_STATUS = Number(sortVal);
                    break;
            }
        }

        let joinParams = {
            from: UserModel.CL,
            localField: 'ENROLL_JOIN_USER_ID',
            foreignField: 'USER_MINI_OPENID',
            as: 'user',
        };

        return await EnrollJoinModel.getListJoin(joinParams, where, fields, orderBy, page, size, isTotal, oldTotal);
    }

    /** 清空 */
    async clearEnrollAll(enrollId) {
		// 删除所有打卡记录
		let where = {
			ENROLL_JOIN_ENROLL_ID: enrollId
		}

		// 获取所有打卡记录的表单图片用于删除
		let joinList = await EnrollJoinModel.getAllBig(where, 'ENROLL_JOIN_FORMS', {}, 10000);
		for (let k = 0; k < joinList.length; k++) {
			await cloudUtil.handlerCloudFilesForForms(joinList[k].ENROLL_JOIN_FORMS, []);
		}

		await EnrollJoinModel.del(where);

		// 删除用户统计记录
		let whereUser = {
			ENROLL_USER_ENROLL_ID: enrollId
		}
		await EnrollUserModel.del(whereUser);

		// 更新统计
		let service = new EnrollService();
		await service.statEnrollJoin(enrollId);

		// 清空用户头像列表
		await EnrollModel.edit(enrollId, { ENROLL_USER_LIST: [] });
    }

    /** 删除打卡 */
    async delEnrollJoin(enrollJoinId) {
        let where = {
            _id: enrollJoinId
        }

		// 获取打卡记录
		let enrollJoin = await EnrollJoinModel.getOne(where, 'ENROLL_JOIN_FORMS,ENROLL_JOIN_ENROLL_ID,ENROLL_JOIN_USER_ID');
		if (!enrollJoin) return;

		// 删除表单图片
		await cloudUtil.handlerCloudFilesForForms(enrollJoin.ENROLL_JOIN_FORMS, []);

		await EnrollJoinModel.del(where);

		// 更新统计
		let service = new EnrollService();
		await service.statEnrollJoin(enrollJoin.ENROLL_JOIN_ENROLL_ID, enrollJoin.ENROLL_JOIN_USER_ID, true);
    }

	/**批量删除打卡记录 */
	async batchDelEnrollJoin(enrollJoinIds) {
		if (!Array.isArray(enrollJoinIds) || enrollJoinIds.length == 0) return;

		// 循环调用单条删除，确保图片清理和重算统计
		for (let k = 0; k < enrollJoinIds.length; k++) {
			await this.delEnrollJoin(enrollJoinIds[k]);
		}
	}

	/**批量删除打卡活动 */
	async batchDelEnroll(ids) {
		if (!Array.isArray(ids) || ids.length == 0) return;

		// 循环调用单条删除，确保级联清理正确
		for (let k = 0; k < ids.length; k++) {
			await this.delEnroll(ids[k]);
		}
	}

	/**批量修改打卡活动状态 */
	async batchStatusEnroll(ids, status) {
		if (!Array.isArray(ids) || ids.length == 0) return;
		status = Number(status);

		for (let k = 0; k < ids.length; k++) {
			await EnrollModel.edit(ids[k], { ENROLL_STATUS: status });
		}
	}

    // #####################导出打卡数据
    /**获取打卡数据 */
    async getEnrollJoinDataURL() {
        return await exportUtil.getExportDataURL(EXPORT_ENROLL_JOIN_DATA_KEY);
    }

    /**删除打卡数据 */
    async deleteEnrollJoinDataExcel() {
        return await exportUtil.deleteDataExcel(EXPORT_ENROLL_JOIN_DATA_KEY);
    }

    /**导出打卡数据 */
    async exportEnrollJoinDataExcel({
        enrollId,
        start,
        end,
    }) {
		// 获取打卡活动信息（包含打卡表单设置）
		let enroll = await EnrollModel.getOne(enrollId, 'ENROLL_TITLE,ENROLL_JOIN_FORMS');
		if (!enroll)
			this.AppError('打卡活动不存在');

		let joinForms = enroll.ENROLL_JOIN_FORMS || [];

		// 构建表头
		let title = [
			{ column: '序号', wch: 10 },
			{ column: '昵称', wch: 20 },
			{ column: '手机号', wch: 20 },
			{ column: '打卡日期', wch: 15 },
		];

		// 添加自定义表单字段列（图片、富文本类型除外）
		for (let j = 0; j < joinForms.length; j++) {
			if (joinForms[j].type == 'image' || joinForms[j].type == 'content') continue;
			title.push({ column: joinForms[j].title, wch: 30 });
		}

		title.push({ column: '打卡时间', wch: 25 });
		title.push({ column: '状态', wch: 15 });

		// 查询条件（日期范围）
		let where = {
			ENROLL_JOIN_ENROLL_ID: enrollId,
			ENROLL_JOIN_DAY: ['between', start, end]
		}

		// 关联用户表
		let joinParams = {
			from: UserModel.CL,
			localField: 'ENROLL_JOIN_USER_ID',
			foreignField: 'USER_MINI_OPENID',
			as: 'user',
		};

		let orderBy = {
			'ENROLL_JOIN_ADD_TIME': 'desc'
		}

		// 获取所有数据（不分页）
		let result = await EnrollJoinModel.getListJoin(joinParams, where, '*', orderBy, 1, 10000, false, 0);
		let list = result.list || [];

		let data = [];
		data.push(title.map(t => t.column));

		for (let k = 0; k < list.length; k++) {
			let row = [];
			row.push(k + 1);
			row.push(list[k].user ? (list[k].user.USER_NAME || '') : '');
			row.push(list[k].user ? (list[k].user.USER_MOBILE || '') : '');
			row.push(list[k].ENROLL_JOIN_DAY || '');

			// 自定义表单字段
			let forms = list[k].ENROLL_JOIN_FORMS || [];
			for (let j = 0; j < joinForms.length; j++) {
				if (joinForms[j].type == 'image' || joinForms[j].type == 'content') continue;
				let val = dataUtil.getValByForm(forms, joinForms[j].mark, joinForms[j].title);
				row.push(val);
			}

			row.push(timeUtil.timestamp2Time(list[k].ENROLL_JOIN_ADD_TIME));
			row.push(EnrollJoinModel.getDesc('STATUS', list[k].ENROLL_JOIN_STATUS));

			data.push(row);
		}

		let total = data.length - 1;

		return await exportUtil.exportDataExcel(
			EXPORT_ENROLL_JOIN_DATA_KEY,
			enroll.ENROLL_TITLE + '-打卡数据',
			total,
			data
		);
    }

}

module.exports = AdminEnrollService;