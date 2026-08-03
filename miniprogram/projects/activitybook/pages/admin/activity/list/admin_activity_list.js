const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const ActivityBiz = require('../../../../biz/activity_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const helper = require('../../../../../../helper/helper.js');
const projectSetting = require('../../../../public/project_setting.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,

		// 批量操作相关
		batchMode: false, // 是否批量选择模式
		selectedIds: [], // 已选中的记录ID
		_allSelected: false, // 当前页是否全选
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		wx.setNavigationBarTitle({
			title: projectSetting.ACTIVITY_NAME + '-管理',
		});
		this.setData({
			ACTIVITY_NAME: projectSetting.ACTIVITY_NAME
		});

		//设置搜索菜单
		this._getSearchMenu();

	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: async function () { },

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () { },

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () { },

	url: async function (e) {
		pageHelper.url(e, this);
	},

	bindCommListCmpt: function (e) {
		if (helper.isDefined(e.detail.search)) {
			this.setData({ search: '', sortType: '' });
		} else {
			let dataList = e.detail.dataList;
			if (dataList && dataList.list) {
				let selectedIds = this.data.selectedIds;
				for (let k = 0; k < dataList.list.length; k++) {
					dataList.list[k]._selected = selectedIds.indexOf(dataList.list[k]._id) > -1;
				}
			}
			this.setData({ dataList });
			if (e.detail.sortType)
				this.setData({ sortType: e.detail.sortType });
		}
	},

	bindJoinMoreTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let itemList = ['报名名单管理', '导出名单Excel表格', '管理员核销报名码', '获取用户自助签到码', '清空报名数据'];

		let activityId = pageHelper.dataset(e, 'id');
		let title = encodeURIComponent(pageHelper.dataset(e, 'title'));

		wx.showActionSheet({
			itemList,
			success: async res => {
				switch (res.tapIndex) {
					case 0: {
						wx.navigateTo({
							url: '../join_list/admin_activity_join_list?activityId=' + activityId + '&title=' + title,
						});
						break;
					}
					case 1: {
						wx.navigateTo({
							url: '../export/admin_activity_export?activityId=' + activityId + '&title=' + title,
						});
						break;
					}
					case 2: {
						wx.navigateTo({
							url: '../scan/admin_activity_scan?activityId=' + activityId + '&title=' + title,
						});
						break;
					}
					case 3: {
						wx.navigateTo({
							url: '../self/admin_activity_self?activityId=' + activityId + '&title=' + title,
						});
						break;
					}
					case 4: {
						this._clear(e);
					}
				}
			},
			fail: function (res) { }
		})
	},

	_clear: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');

		let params = {
			id
		}

		let callback = async () => {
			try {
				let opts = {
					title: '处理中'
				}
				await cloudHelper.callCloudSumbit('admin/activity_clear', params, opts).then(res => {
					let node = {
						'ACTIVITY_JOIN_CNT': 0,
					}
					pageHelper.modifyPrevPageListNodeObject(id, node, 1);

					pageHelper.showSuccToast('清空完成');
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认清空所有数据？清空后不可恢复', callback);

	},

	bindStatusMoreTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let itemList = ['启用', '停用 (不显示)', '删除'];
		wx.showActionSheet({
			itemList,
			success: async res => {
				switch (res.tapIndex) {
					case 0: { //启用
						e.currentTarget.dataset['status'] = 1;
						await this._setStatus(e);
						break;
					}
					case 1: { //停止 
						e.currentTarget.dataset['status'] = 0;
						await this._setStatus(e);
						break;
					}
					case 2: { //删除
						await this._del(e);
						break;
					}
				}
			},
			fail: function (res) { }
		})
	},

	bindMoreTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let idx = pageHelper.dataset(e, 'idx');

		let order = this.data.dataList.list[idx].ACTIVITY_ORDER;
		let orderDesc = (order == 0) ? '取消置顶' : '置顶';

		let vouch = this.data.dataList.list[idx].ACTIVITY_VOUCH;
		let vouchDesc = (vouch == 0) ? '推荐到首页' : '取消首页推荐';

		let itemList = ['预览', orderDesc, vouchDesc, '生成专属二维码', '评论管理'];
		let id = pageHelper.dataset(e, 'id');

		wx.showActionSheet({
			itemList,
			success: async res => {
				switch (res.tapIndex) {
					case 0: { //预览 
						wx.navigateTo({
							url: '../../../activity/detail/activity_detail?id=' + id,
						});
						break;
					}
					case 1: { //置顶 
						let sort = (order == 0) ? 9999 : 0;
						e.currentTarget.dataset['sort'] = sort;
						await this._setSort(e);
						break;
					}
					case 2: { //上首页 
						vouch = (vouch == 0) ? 1 : 0;
						e.currentTarget.dataset['vouch'] = vouch;
						await this._setVouch(e);
						break;
					}
					case 3: { //二维码 
						let title = encodeURIComponent(pageHelper.dataset(e, 'title'));
						let qr = encodeURIComponent(pageHelper.dataset(e, 'qr'));
						wx.navigateTo({
							url: `../../setup/qr/admin_setup_qr?title=${title}&qr=${qr}`,
						})
						break;
					}
					case 4: { //评论管理  
						wx.navigateTo({
							url: '../../../comment/list/comment_list?source=admin&id=' + id,
						})
						break;
					}
				}


			},
			fail: function (res) { }
		})
	},

	_setSort: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let id = pageHelper.dataset(e, 'id');
		let sort = pageHelper.dataset(e, 'sort');
		if (!id) return;

		let params = {
			id,
			sort
		}

		try {
			await cloudHelper.callCloudSumbit('admin/activity_sort', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'ACTIVITY_ORDER', sort);
				this.setData({
					dataList: this.data.dataList
				});
				pageHelper.showSuccToast('设置成功');
			});
		} catch (err) {
			console.log(err);
		}
	},

	_setVouch: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let id = pageHelper.dataset(e, 'id');
		let vouch = pageHelper.dataset(e, 'vouch');
		if (!id) return;

		let params = {
			id,
			vouch
		}

		try {
			await cloudHelper.callCloudSumbit('admin/activity_vouch', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'ACTIVITY_VOUCH', vouch);
				this.setData({
					dataList: this.data.dataList
				});
				pageHelper.showSuccToast('设置成功');
			});
		} catch (err) {
			console.log(err);
		}
	},

	_del: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');

		let params = {
			id
		}

		let callback = async () => {
			try {
				let opts = {
					title: '删除中'
				}
				await cloudHelper.callCloudSumbit('admin/activity_del', params, opts).then(res => {
					pageHelper.delListNode(id, this.data.dataList.list, '_id');
					this.data.dataList.total--;
					this.setData({
						dataList: this.data.dataList
					});
					pageHelper.showSuccToast('删除成功');
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认删除？删除后报名数据将一并删除且不可恢复', callback);

	},

	_setStatus: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');
		let status = Number(pageHelper.dataset(e, 'status'));
		let params = {
			id,
			status
		}

		try {
			await cloudHelper.callCloudSumbit('admin/activity_status', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'ACTIVITY_STATUS', status, '_id');
				pageHelper.modifyListNode(id, this.data.dataList.list, 'statusDesc', res.data.statusDesc, '_id');
				this.setData({
					dataList: this.data.dataList
				});
				pageHelper.showSuccToast('设置成功');
			});
		} catch (err) {
			console.log(err);
		}
	},

	_getSearchMenu: function () {
		let cateIdOptions = ActivityBiz.getCateList();

		let sortItem1 = [{ label: '分类', type: '', value: 0 }];
		sortItem1 = sortItem1.concat(cateIdOptions);

		let sortItem2 = [
			{ label: '排序', type: '', value: 0 },
			{ label: '按报名人数', type: 'sort', value: 'ACTIVITY_JOIN_CNT|desc' },
			{ label: '按开始时间', type: 'sort', value: 'ACTIVITY_START|desc' },
			{ label: '按报名截止时间', type: 'sort', value: 'ACTIVITY_STOP|desc' },
		];

		let sortItems = [];
		if (sortItem1.length > 2) sortItems.push(sortItem1);
		sortItems.push(sortItem2);

		let sortMenus = [
			{ label: '全部', type: '', value: '' },
			{ label: '正常', type: 'status', value: 1 },
			{ label: '停用', type: 'status', value: 0 },
			{ label: '最新', type: 'sort', value: 'new' },
			{ label: '首页推荐', type: 'vouch', value: 'vouch' },
			{ label: '置顶', type: 'top', value: 'top' },
		]
		this.setData({
			search: '',
			cateIdOptions,
			sortItems,
			sortMenus,
			isLoad: true
		})
	},

	// 切换批量选择模式
	bindBatchModeTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let batchMode = !this.data.batchMode;
		let dataList = this.data.dataList;
		let updateData = { batchMode, selectedIds: [], _allSelected: false };
		if (dataList && dataList.list) {
			for (let k = 0; k < dataList.list.length; k++) {
				updateData['dataList.list[' + k + ']._selected'] = false;
			}
		}
		this.setData(updateData);
	},

	// 单选/取消某条记录
	bindSelectItemTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let id = pageHelper.dataset(e, 'id');
		let selectedIds = this.data.selectedIds.slice();
		let idx = selectedIds.indexOf(id);
		if (idx > -1) {
			selectedIds.splice(idx, 1);
		} else {
			selectedIds.push(id);
		}
		let isSelected = selectedIds.indexOf(id) > -1;
		let list = (this.data.dataList && this.data.dataList.list) || [];
		let updateData = { selectedIds };
		for (let k = 0; k < list.length; k++) {
			if (list[k]._id === id) {
				updateData['dataList.list[' + k + ']._selected'] = isSelected;
				break;
			}
		}
		updateData._allSelected = list.length > 0 && list.every(item => selectedIds.indexOf(item._id) > -1);
		this.setData(updateData);
	},

	// 全选/取消全选（当前页）
	bindSelectAllTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let list = (this.data.dataList && this.data.dataList.list) || [];
		let selectedIds = this.data.selectedIds.slice();
		// 当前页是否已全部选中
		let allSelected = list.length > 0 && list.every(item => selectedIds.indexOf(item._id) > -1);
		let updateData = {};
		if (allSelected) {
			// 取消当前页选中
			let pageIds = list.map(item => item._id);
			selectedIds = selectedIds.filter(id => pageIds.indexOf(id) == -1);
		} else {
			// 选中当前页
			for (let k = 0; k < list.length; k++) {
				if (selectedIds.indexOf(list[k]._id) == -1) {
					selectedIds.push(list[k]._id);
				}
			}
		}
		for (let k = 0; k < list.length; k++) {
			updateData['dataList.list[' + k + ']._selected'] = selectedIds.indexOf(list[k]._id) > -1;
		}
		updateData.selectedIds = selectedIds;
		updateData._allSelected = list.length > 0 && list.every(item => selectedIds.indexOf(item._id) > -1);
		this.setData(updateData);
	},

	// 批量启用/禁用
	bindBatchStatusTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let status = Number(pageHelper.dataset(e, 'status'));
		let ids = this.data.selectedIds;
		if (!ids.length) {
			pageHelper.showNoneToast('请先选择记录');
			return;
		}

		let desc = status == 1 ? '启用' : '停用';
		let callback = async () => {
			try {
				let opts = { title: '处理中' };
				let params = { ids, status };
				await cloudHelper.callCloudSumbit('admin/activity_batch_status', params, opts).then(res => {
					// 刷新列表
					this._afterBatch();
					pageHelper.showSuccToast('批量' + desc + '成功');
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认批量' + desc + '选中的' + ids.length + '条记录？', callback);
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
				await cloudHelper.callCloudSumbit('admin/activity_batch_del', params, opts).then(res => {
					this._afterBatch();
					pageHelper.showSuccToast('批量删除成功');
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认批量删除选中的' + ids.length + '条记录？删除后报名数据将一并删除且不可恢复', callback);
	},

	// 批量操作后统一处理：退出批量模式并刷新列表
	_afterBatch: function () {
		let dataList = this.data.dataList;
		let updateData = { batchMode: false, selectedIds: [], _allSelected: false };
		if (dataList && dataList.list) {
			for (let k = 0; k < dataList.list.length; k++) {
				updateData['dataList.list[' + k + ']._selected'] = false;
			}
		}
		this.setData(updateData);
		// 刷新列表组件
		let listComp = this.selectComponent('#cmpt-comm-list');
		if (listComp) listComp.reload();
	},

})