const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cacheHelper = require('../../../../../../helper/cache_helper.js');
const helper = require('../../../../../../helper/helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');

const CACHE_CANCEL_REASON = 'ACTIVITY_JOIN_CANCEL_REASON';
const CACHE_REFUSE_REASON = 'ACTIVITY_JOIN_REFUSE_REASON';

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		isAllFold: true,

		parentDayIdx: 0,
		parentTimeIdx: 0,

		menuIdx: 0,

		activityId: '',

		title: '',
		titleEn: '',

		cancelModalShow: false,
		cancelAllModalShow: false,
		formReason: '',
		curIdx: -1,

		// 批量操作相关
		selIds: [], // 已勾选的报名记录id（_id）
		isSelAll: false, // 是否已全选当前列表
		canBatchPass: false, // 当前列表是否含可通过的记录（控制批量通过按钮显示）
		canBatchRefuse: false, // 当前列表是否含可拒绝的记录（控制批量拒绝按钮显示）
		refuseModalShow: false, // 批量拒绝弹窗是否显示
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		// 附加参数 
		if (options && options.activityId) {
			//设置搜索菜单 
			this._getSearchMenu();

			this.setData({
				activityId: options.activityId,
				_params: {
					activityId: options.activityId
				}
			}, () => {
				this.setData({
					isLoad: true
				});
			});
		}

		if (options && options.title) {
			let title = decodeURIComponent(options.title);
			this.setData({
				title,
				titleEn: options.title
			});
			wx.setNavigationBarTitle({
				title: '活动名单 - ' + title
			});
		}
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {

	},

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () {

	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () {

	},

	url: async function (e) {
		pageHelper.url(e, this);
	},

	bindUnFoldTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let dataList = this.data.dataList;
		dataList.list[idx].fold = false;
		this.setData({
			dataList
		});
	},

	bindFoldTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let dataList = this.data.dataList;
		dataList.list[idx].fold = true;
		this.setData({
			dataList
		});
	},

	bindFoldAllTap: function (e) {
		let dataList = this.data.dataList;
		for (let k = 0; k < dataList.list.length; k++) {
			dataList.list[k].fold = true;
		}
		this.setData({
			isAllFold: true,
			dataList
		});
	},

	bindUnFoldAllTap: function (e) {
		let dataList = this.data.dataList;
		for (let k = 0; k < dataList.list.length; k++) {
			dataList.list[k].fold = false;
		}
		this.setData({
			isAllFold: false,
			dataList
		});
	},

	bindCopyTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let forms = this.data.dataList.list[idx].ACTIVITY_JOIN_FORMS;

		let ret = '';

		if (this.data.title)
			ret += `活动：${this.data.title}\r`;

		for (let k = 0; k < forms.length; k++) {
			ret += forms[k].title + '：' + forms[k].val + '\r';
		}
		wx.setClipboardData({
			data: ret,
			success(res) {
				wx.getClipboardData({
					success(res) {
						pageHelper.showSuccToast('已复制到剪贴板');
					}
				})
			}
		});

	},

	bindCancelTap: function (e) {
		this.setData({
			formReason: cacheHelper.get(CACHE_CANCEL_REASON) || '',
			curIdx: pageHelper.dataset(e, 'idx'),
			cancelModalShow: true
		});
	},

	bindCancelAllTap: function (e) {
		this.setData({
			formReason: '',
			cancelAllModalShow: true
		});
	},

	bindCancelCmpt: async function () {
		let e = {
			currentTarget: {
				dataset: {
					status: 99,
					idx: this.data.curIdx
				}
			}
		}
		cacheHelper.set(CACHE_CANCEL_REASON, this.data.formReason, 86400 * 365);
		await this.bindStatusTap(e);
	},

	bindCancelAllCmpt: async function () {
		try {
			let params = {
				reason: this.data.formReason,
				activityId: this.data.activityId
			}
			let opt = {
				title: '处理中'
			}
			await cloudHelper.callCloudSumbit('admin/activity_cancel_join_all', params, opt).then(res => {
				let callback = () => {
					wx.redirectTo({
						url: `admin_activity_join_list?activityId=${this.data.activityId}&title=${this.data.titleEn}`,
					});
				}
				pageHelper.showSuccToast('处理完成', 1500, callback);
			})
		} catch (err) {
			console.log(err);
		};
	},

	bindCheckinTap: async function (e) {
		let flag = Number(pageHelper.dataset(e, 'flag'));

		let callback = async () => {
			let idx = Number(pageHelper.dataset(e, 'idx'));
			let dataList = this.data.dataList;
			let activityJoinId = dataList.list[idx]._id;
			let params = {
				activityJoinId,
				flag,
			}
			let opts = {
				title: '处理中'
			}
			try {
				await cloudHelper.callCloudSumbit('admin/activity_join_checkin', params, opts).then(res => {
					let cb = () => {
						let sortIndex = this.selectComponent('#cmpt-comm-list').getSortIndex();
						if (sortIndex >= 8 && !this.data.search) { // 全部或者检索的结果
							dataList.list.splice(idx, 1);
							dataList.total--;
						} else {
							dataList.list[idx].ACTIVITY_JOIN_IS_CHECKIN = flag;
						}
						this.setData({
							dataList
						});
					}

					pageHelper.showSuccToast('操作成功', 1000, cb);


				});
			} catch (err) {
				console.error(err);
			}
		}
		if (flag == 1)
			pageHelper.showConfirm('确认「签到核销」？', callback);
		else if (flag == 0)
			pageHelper.showConfirm('确认「取消签到」？', callback);

	},

	bindDelTap: async function (e) {

		let callback = async () => {
			let idx = Number(pageHelper.dataset(e, 'idx'));
			let dataList = this.data.dataList;
			let activityJoinId = dataList.list[idx]._id;
			let params = {
				activityJoinId
			}
			let opts = {
				title: '删除中'
			}
			try {
				await cloudHelper.callCloudSumbit('admin/activity_join_del', params, opts).then(res => {

					let cb = () => {
						let dataList = this.data.dataList;
						dataList.list.splice(idx, 1);
						dataList.total--;
						this.setData({
							dataList
						});
					}

					pageHelper.showSuccToast('删除成功', 1000, cb);
				});
			} catch (err) {
				console.error(err);
			}
		}

		pageHelper.showConfirm('确认删除该报名记录？ 删除后用户将无法查询到本报名记录', callback);


	},

	bindStatusTap: async function (e) {
		let status = Number(pageHelper.dataset(e, 'status'));
		let oldStatus = Number(pageHelper.dataset(e, 'old'));

		let callback = async () => {
			let idx = Number(pageHelper.dataset(e, 'idx'));
			let dataList = this.data.dataList;
			let activityJoinId = dataList.list[idx]._id;
			let params = {
				activityJoinId,
				status,
				reason: this.data.formReason
			}
			let opts = {
				title: '处理中'
			}
			try {
				await cloudHelper.callCloudSumbit('admin/activity_join_status', params, opts).then(res => {
					pageHelper.showSuccToast('操作成功', 1000);
					let sortIndex = this.selectComponent('#cmpt-comm-list').getSortIndex();

					if (sortIndex != -1 && sortIndex != 5 && !this.data.search) { // 全部或者检索的结果
						dataList.list.splice(idx, 1);
						dataList.total--;
					} else {
						dataList.list[idx].ACTIVITY_JOIN_REASON = this.data.formReason;
						dataList.list[idx].ACTIVITY_JOIN_STATUS = status;
						dataList.list[idx].ACTIVITY_JOIN_IS_CHECKIN = 0;
					}

					this.setData({
						cancelModalShow: false,
						formReason: '',
						curIdx: -1,
						dataList
					});

				});
			} catch (err) {
				console.error(err);
			}
		}

		switch (status) {
			case 99:
				await callback();
				break;
			case 1: {

				if (oldStatus == 0)
					pageHelper.showConfirm('确认变更为「报名成功」状态？', callback);
				else if (oldStatus == 99)
					pageHelper.showConfirm('确认变更为「报名成功」状态？', callback);
				break;
			}
		}

	},

	bindCommListCmpt: function (e) {

		if (helper.isDefined(e.detail.search))
			this.setData({
				search: '',
				sortType: '',
			});
		else {
			let dataList = e.detail.dataList;
			if (dataList) {
				for (let k = 0; k < dataList.list.length; k++) {
					dataList.list[k].fold = this.data.isAllFold;
				}
			}

			this.setData({
				dataList,
			});
			if (e.detail.sortType)
				this.setData({
					sortType: e.detail.sortType,
				});

			// 列表刷新（含搜索/筛选/分页）后清空勾选状态，避免误操作
			if (this.data.selIds.length) this._setSel([]);
		}

	},

	/** 同步勾选状态到列表数据（selIds为已勾选的报名记录id数组） */
	_setSel: function (selIds) {
		let dataList = this.data.dataList;
		let list = (dataList && dataList.list) ? dataList.list : [];

		// 是否已全选当前已加载的记录
		let isSelAll = list.length > 0 && selIds.length >= list.length;

		// 统计当前列表中各状态的记录（控制批量按钮的显示）
		let canBatchPass = false; // 含待审核/未过审的记录，可批量通过
		let canBatchRefuse = false; // 含待审核/报名成功的记录，可批量拒绝
		for (let k = 0; k < list.length; k++) {
			list[k]._sel = selIds.includes(list[k]._id);
			if (list[k].ACTIVITY_JOIN_STATUS == 0 || list[k].ACTIVITY_JOIN_STATUS == 99) canBatchPass = true;
			if (list[k].ACTIVITY_JOIN_STATUS == 0 || list[k].ACTIVITY_JOIN_STATUS == 1) canBatchRefuse = true;
		}

		this.setData({ selIds, isSelAll, canBatchPass, canBatchRefuse, dataList });
	},

	/** 勾选/取消勾选单条报名记录 */
	bindSelTap: function (e) {
		let idx = Number(pageHelper.dataset(e, 'idx'));
		let list = this.data.dataList.list;
		let id = list[idx]._id;

		let selIds = this.data.selIds;
		let pos = selIds.indexOf(id);
		if (pos > -1)
			selIds.splice(pos, 1); // 取消勾选
		else
			selIds.push(id); // 勾选

		this._setSel(selIds);
	},

	/** 全选/反选当前列表 */
	bindSelAllTap: function () {
		let dataList = this.data.dataList;
		if (!dataList || !dataList.list || !dataList.list.length) return;

		// 已全选则反选（清空），否则全选当前已加载的记录
		let selIds = this.data.isSelAll ? [] : dataList.list.map(item => item._id);
		this._setSel(selIds);
	},

	/** 批量操作成功后刷新列表并清空勾选 */
	_reloadList: function () {
		this._setSel([]);
		this.selectComponent('#cmpt-comm-list').reload(); // 刷新列表
	},

	/** 展示批量审核结果（部分失败时给出明细提示，避免"部分成功部分失败"无感知） */
	_showBatchResult: function (data) {
		if (data && data.failCnt > 0) {
			wx.showModal({
				title: '部分处理失败',
				content: '成功' + data.cnt + '条，失败' + data.failCnt + '条。失败原因：' + (data.failMsg || '未知'),
				showCancel: false,
				confirmText: '知道了'
			});
		} else {
			pageHelper.showSuccToast('操作成功');
		}
	},

	/** 批量审核通过 */
	bindBatchStatusTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let status = Number(pageHelper.dataset(e, 'status'));
		let ids = this.data.selIds;
		if (!ids.length) return pageHelper.showNoneToast('请先勾选报名记录');

		let that = this;
		let callback = async () => {
			try {
				let params = {
					activityId: that.data.activityId,
					ids,
					status
				};
				let opts = { title: '处理中' };
				await cloudHelper.callCloudSumbit('admin/activity_join_batch_status', params, opts).then(res => {
					that._showBatchResult(res.data); // 展示批量处理结果（含部分失败明细）
					that._reloadList();
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认将选中的「' + ids.length + '」条报名记录批量通过？', callback);
	},

	/** 打开批量拒绝弹窗 */
	bindBatchRefuseTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		if (!this.data.selIds.length) return pageHelper.showNoneToast('请先勾选报名记录');

		this.setData({
			formReason: cacheHelper.get(CACHE_REFUSE_REASON) || '',
			refuseModalShow: true
		});
	},

	/** 批量拒绝弹窗-确定（统一填写理由） */
	bindRefuseCmpt: async function () {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selIds;
		if (!ids.length) return;

		cacheHelper.set(CACHE_REFUSE_REASON, this.data.formReason, 86400 * 365);

		try {
			let params = {
				activityId: this.data.activityId,
				ids,
				status: 99,
				reason: this.data.formReason
			};
			let opts = { title: '处理中' };
			await cloudHelper.callCloudSumbit('admin/activity_join_batch_status', params, opts).then(res => {
				this.setData({
					refuseModalShow: false,
					formReason: ''
				});
				this._showBatchResult(res.data); // 展示批量处理结果（含部分失败明细）
				this._reloadList();
			});
		} catch (err) {
			console.log(err);
		}
	},

	/** 批量删除报名记录 */
	bindBatchDelTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selIds;
		if (!ids.length) return pageHelper.showNoneToast('请先勾选报名记录');

		let that = this;
		let callback = async () => {
			try {
				let params = {
					activityId: that.data.activityId,
					ids
				};
				let opts = { title: '删除中' };
				await cloudHelper.callCloudSumbit('admin/activity_join_batch_del', params, opts).then(res => {
					pageHelper.showSuccToast('删除成功');
					that._reloadList();
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认删除选中的「' + ids.length + '」条报名记录？删除后用户将无法查询到报名记录', callback);
	},

	// 修改与展示状态菜单
	_getSearchMenu: function () {

		let sortItems = [];
		let sortMenus = [
			{ label: '全部', type: '', value: '' },
			{ label: `待审核`, type: 'status', value: 0 },
			{ label: `报名成功`, type: 'status', value: 1 },
			{ label: `未过审`, type: 'status', value: 99 },
			{ label: `已签到`, type: 'checkin', value: 1 },
			{ label: `未签到`, type: 'checkin', value: 0 }
		];
		this.setData({
			sortItems,
			sortMenus
		})


	},

	bindClearReasonTap: function (e) {
		this.setData({
			formReason: ''
		})
	}
})