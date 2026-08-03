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

		// 批量操作
		isBatchMode: false,
		selectedIds: [],
		batchRefuseModalShow: false,
		batchFormReason: ''
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
					// 同步批量选中状态
					if (this.data.isBatchMode && this.data.selectedIds.length > 0) {
						dataList.list[k]._checked = this.data.selectedIds.indexOf(dataList.list[k]._id) >= 0;
					}
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

	// ==================== 批量操作 ====================

	// 切换批量模式
	bindToggleBatch: function () {
		let isBatchMode = !this.data.isBatchMode;
		this._setSelectedIds([]);
		this.setData({
			isBatchMode,
			batchRefuseModalShow: false,
			batchFormReason: ''
		});
	},

	// 选中/取消某条
	bindSelectItem: function (e) {
		let id = pageHelper.dataset(e, 'id');
		if (!id) return;
		let selectedIds = this.data.selectedIds.slice();
		let idx = selectedIds.indexOf(id);
		if (idx >= 0) {
			selectedIds.splice(idx, 1);
		} else {
			selectedIds.push(id);
		}
		this._setSelectedIds(selectedIds);
	},

	// 全选/取消全选当前列表
	bindSelectAll: function (e) {
		let checked = (e.detail && e.detail.value && e.detail.value.length > 0);
		let dataList = this.data.dataList;
		if (!dataList || !dataList.list) return;
		let selectedIds = checked ? dataList.list.map(item => item._id) : [];
		this._setSelectedIds(selectedIds);
	},

	// 更新选中状态并同步列表项 _checked 标记
	_setSelectedIds: function (selectedIds) {
		let dataList = this.data.dataList;
		if (dataList && dataList.list) {
			for (let k = 0; k < dataList.list.length; k++) {
				dataList.list[k]._checked = selectedIds.indexOf(dataList.list[k]._id) >= 0;
			}
		}
		this.setData({
			selectedIds,
			dataList
		});
	},

	// 当前列表是否全部选中
	_isAllSelected: function () {
		let dataList = this.data.dataList;
		if (!dataList || !dataList.list || dataList.list.length === 0) return false;
		return this.data.selectedIds.length === dataList.list.length;
	},

	// 判断是否已选择
	_checkSelected: function () {
		if (!this.data.selectedIds || this.data.selectedIds.length === 0) {
			pageHelper.showModal('请先选择要操作的记录');
			return false;
		}
		return true;
	},

	// 刷新列表并清空选中
	_reloadAfterBatch: async function () {
		try {
			await this.selectComponent('#cmpt-comm-list').reload();
		} catch (err) {
			console.error(err);
		}
		this._setSelectedIds([]);
	},

	// 批量审核
	bindBatchStatus: function (e) {
		if (!this._checkSelected()) return;
		let status = Number(pageHelper.dataset(e, 'status'));

		// 拒绝需要弹理由输入框
		if (status === 99) {
			this.setData({
				batchRefuseModalShow: true,
				batchFormReason: ''
			});
			return;
		}

		// 通过直接确认
		let activityJoinIds = this.data.selectedIds;
		let callback = async () => {
			try {
				let opts = { title: '处理中' };
				let params = { activityJoinIds, status };
				await cloudHelper.callCloudSumbit('admin/activity_batch_status_join', params, opts);
				pageHelper.showSuccToast('批量操作成功', 1000);
				await this._reloadAfterBatch();
			} catch (err) {
				console.error(err);
			}
		};
		pageHelper.showConfirm(`确认批量通过选中的 ${activityJoinIds.length} 条报名记录？`, callback);
	},

	// 批量拒绝弹窗确认
	bindBatchRefuseCmpt: async function () {
		if (!this._checkSelected()) return;
		let activityJoinIds = this.data.selectedIds;
		let reason = this.data.batchFormReason;
		try {
			let opts = { title: '处理中' };
			let params = { activityJoinIds, status: 99, reason };
			await cloudHelper.callCloudSumbit('admin/activity_batch_status_join', params, opts);
			this.setData({ batchRefuseModalShow: false, batchFormReason: '' });
			pageHelper.showSuccToast('批量拒绝成功', 1000);
			await this._reloadAfterBatch();
		} catch (err) {
			console.error(err);
		}
	},

	// 批量拒绝弹窗取消/清空
	bindBatchRefuseClose: function () {
		this.setData({
			batchRefuseModalShow: false,
			batchFormReason: ''
		});
	},

	bindBatchReasonInput: function (e) {
		this.setData({
			batchFormReason: e.detail.value
		});
	},

	// 批量删除
	bindBatchDel: function () {
		if (!this._checkSelected()) return;
		let activityJoinIds = this.data.selectedIds;
		let callback = async () => {
			try {
				let opts = { title: '删除中' };
				let params = { activityJoinIds };
				await cloudHelper.callCloudSumbit('admin/activity_batch_del_join', params, opts);
				pageHelper.showSuccToast('批量删除成功', 1000);
				await this._reloadAfterBatch();
			} catch (err) {
				console.error(err);
			}
		};
		pageHelper.showConfirm(`确认批量删除选中的 ${activityJoinIds.length} 条报名记录？删除后不可恢复`, callback);
	}
})