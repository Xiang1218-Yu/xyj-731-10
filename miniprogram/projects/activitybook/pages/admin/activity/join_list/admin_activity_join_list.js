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
		batchMode: false, // 是否批量选择模式
		selectedIds: [], // 已选中的报名记录ID
		batchRefuseModalShow: false, // 批量拒绝理由弹窗
		batchFormReason: '', // 批量拒绝理由
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
		}

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
	},

	// 清空批量拒绝理由
	bindBatchClearReasonTap: function (e) {
		this.setData({
			batchFormReason: ''
		})
	},

	// 切换批量选择模式
	bindBatchModeTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let batchMode = !this.data.batchMode;
		this.setData({
			batchMode,
			selectedIds: []
		});
	},

	// 单选/取消某条报名记录
	bindSelectItemTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');
		let selectedIds = this.data.selectedIds;
		let idx = selectedIds.indexOf(id);
		if (idx > -1) {
			selectedIds.splice(idx, 1);
		} else {
			selectedIds.push(id);
		}
		this.setData({ selectedIds });
	},

	// 全选/取消全选（当前页）
	bindSelectAllTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let list = (this.data.dataList && this.data.dataList.list) || [];
		let selectedIds = this.data.selectedIds;
		let allSelected = list.length > 0 && list.every(item => selectedIds.indexOf(item._id) > -1);
		if (allSelected) {
			let pageIds = list.map(item => item._id);
			selectedIds = selectedIds.filter(id => pageIds.indexOf(id) == -1);
		} else {
			for (let k = 0; k < list.length; k++) {
				if (selectedIds.indexOf(list[k]._id) == -1) {
					selectedIds.push(list[k]._id);
				}
			}
		}
		this.setData({ selectedIds });
	},

	// 批量审核通过
	bindBatchApproveTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selectedIds;
		if (!ids.length) {
			pageHelper.showNoneToast('请先选择记录');
			return;
		}

		let callback = async () => {
			try {
				let opts = { title: '处理中' };
				let params = { ids, status: 1 };
				await cloudHelper.callCloudSumbit('admin/activity_join_batch_status', params, opts).then(res => {
					this._afterBatch();
					pageHelper.showSuccToast('批量审核通过成功');
				});
			} catch (err) {
				console.error(err);
			}
		}
		pageHelper.showConfirm('确认批量审核通过选中的' + ids.length + '条报名记录？', callback);
	},

	// 弹出批量拒绝理由输入框
	bindBatchRefuseTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selectedIds;
		if (!ids.length) {
			pageHelper.showNoneToast('请先选择记录');
			return;
		}
		this.setData({
			batchRefuseModalShow: true,
			batchFormReason: ''
		});
	},

	// 确认批量拒绝
	bindBatchRefuseCmpt: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selectedIds;
		if (!ids.length) {
			pageHelper.showNoneToast('请先选择记录');
			return;
		}

		let callback = async () => {
			try {
				let opts = { title: '处理中' };
				let params = { ids, status: 99, reason: this.data.batchFormReason };
				await cloudHelper.callCloudSumbit('admin/activity_join_batch_status', params, opts).then(res => {
					this.setData({ batchRefuseModalShow: false });
					this._afterBatch();
					pageHelper.showSuccToast('批量拒绝成功');
				});
			} catch (err) {
				console.error(err);
			}
		}
		pageHelper.showConfirm('确认批量拒绝选中的' + ids.length + '条报名记录？', callback);
	},

	// 批量删除
	bindBatchDelTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selectedIds;
		if (!ids.length) {
			pageHelper.showNoneToast('请先选择记录');
			return;
		}

		let callback = async () => {
			try {
				let opts = { title: '删除中' };
				let params = { ids };
				await cloudHelper.callCloudSumbit('admin/activity_join_batch_del', params, opts).then(res => {
					this._afterBatch();
					pageHelper.showSuccToast('批量删除成功');
				});
			} catch (err) {
				console.error(err);
			}
		}
		pageHelper.showConfirm('确认批量删除选中的' + ids.length + '条报名记录？删除后不可恢复', callback);
	},

	// 批量操作后统一处理：退出批量模式并刷新列表
	_afterBatch: function () {
		this.setData({
			batchMode: false,
			selectedIds: [],
			batchFormReason: ''
		});
		let listComp = this.selectComponent('#cmpt-comm-list');
		if (listComp) listComp.reload();
	},
})