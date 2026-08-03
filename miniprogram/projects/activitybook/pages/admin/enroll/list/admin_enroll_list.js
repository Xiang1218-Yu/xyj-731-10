const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const EnrollBiz = require('../../../../biz/enroll_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const projectSetting = require('../../../../public/project_setting.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,

		// 批量操作
		isBatchMode: false,
		selectedIds: [],
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		wx.setNavigationBarTitle({
			title: projectSetting.ENROLL_NAME + '项目-管理',
		});
		this.setData({
			ENROLL_NAME: projectSetting.ENROLL_NAME
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
		pageHelper.commListListener(this, e);
		// 列表刷新后同步批量选中状态
		if (this.data.isBatchMode && this.data.selectedIds.length > 0 && this.data.dataList && this.data.dataList.list) {
			let selectedIds = this.data.selectedIds;
			for (let k = 0; k < this.data.dataList.list.length; k++) {
				this.data.dataList.list[k]._checked = selectedIds.indexOf(this.data.dataList.list[k]._id) >= 0;
			}
			this.setData({ dataList: this.data.dataList });
		}
	},


	bindJoinMoreTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let itemList = ['打卡记录管理', '导出记录Excel表格', '清空打卡记录'];

		let enrollId = pageHelper.dataset(e, 'id');
		let title = encodeURIComponent(pageHelper.dataset(e, 'title'));

		wx.showActionSheet({
			itemList,
			success: async res => {
				switch (res.tapIndex) {
					case 0: {
						let checkSet = encodeURIComponent(pageHelper.dataset(e, 'check'));
						wx.navigateTo({
							url: '../join_list/admin_enroll_join_list?enrollId=' + enrollId + '&title=' + title + '&checkSet=' + checkSet,
						});
						break;
					}
					case 1: {
						wx.navigateTo({
							url: '../export/admin_enroll_export?enrollId=' + enrollId + '&title=' + title,
						});
						break;
					}
					case 2: {
						this._clear(e);
						break;
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
				await cloudHelper.callCloudSumbit('admin/enroll_clear', params, opts).then(res => { 
					let node = {
						'ENROLL_JOIN_CNT': 0, 
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

		let order = this.data.dataList.list[idx].ENROLL_ORDER;
		let orderDesc = (order == 0) ? '取消置顶' : '置顶';

		let vouch = this.data.dataList.list[idx].ENROLL_VOUCH;
		let vouchDesc = (vouch == 0) ? '推荐到首页' : '取消首页推荐';

		let itemList = ['预览', orderDesc, vouchDesc, '生成专属二维码'];

		wx.showActionSheet({
			itemList,
			success: async res => {
				switch (res.tapIndex) {
					case 0: { //预览
						let id = pageHelper.dataset(e, 'id');
						wx.navigateTo({
							url: '../../../enroll/detail/enroll_detail?id=' + id,
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
			await cloudHelper.callCloudSumbit('admin/enroll_sort', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'ENROLL_ORDER', sort);
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
			await cloudHelper.callCloudSumbit('admin/enroll_vouch', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'ENROLL_VOUCH', vouch);
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
				await cloudHelper.callCloudSumbit('admin/enroll_del', params, opts).then(res => {
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
		pageHelper.showConfirm('确认删除？删除后用户记录数据将一并删除且不可恢复', callback);

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
			await cloudHelper.callCloudSumbit('admin/enroll_status', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'ENROLL_STATUS', status, '_id');
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

	// ==================== 批量操作 ====================

	// 切换批量模式
	bindToggleBatch: function () {
		let isBatchMode = !this.data.isBatchMode;
		this._setSelectedIds([]);
		this.setData({ isBatchMode });
	},

	// 选中/取消某条
	bindSelectItem: function (e) {
		let id = pageHelper.dataset(e, 'id');
		if (!id) return;
		let selectedIds = this.data.selectedIds.slice();
		let idx = selectedIds.indexOf(id);
		if (idx >= 0) selectedIds.splice(idx, 1);
		else selectedIds.push(id);
		this._setSelectedIds(selectedIds);
	},

	// 全选/取消全选
	bindSelectAll: function (e) {
		let checked = (e.detail && e.detail.value && e.detail.value.length > 0);
		let dataList = this.data.dataList;
		if (!dataList || !dataList.list) return;
		this._setSelectedIds(checked ? dataList.list.map(item => item._id) : []);
	},

	// 更新选中并同步列表 _checked 标记
	_setSelectedIds: function (selectedIds) {
		let dataList = this.data.dataList;
		if (dataList && dataList.list) {
			for (let k = 0; k < dataList.list.length; k++) {
				dataList.list[k]._checked = selectedIds.indexOf(dataList.list[k]._id) >= 0;
			}
		}
		this.setData({ selectedIds, dataList });
	},

	_checkSelected: function () {
		if (!this.data.selectedIds || this.data.selectedIds.length === 0) {
			pageHelper.showModal('请先选择要操作的记录');
			return false;
		}
		return true;
	},

	_reloadAfterBatch: async function () {
		try {
			await this.selectComponent('#cmpt-comm-list').reload();
		} catch (err) {
			console.error(err);
		}
		this._setSelectedIds([]);
	},

	// 批量删除
	bindBatchDel: function () {
		if (!this._checkSelected()) return;
		let ids = this.data.selectedIds;
		let callback = async () => {
			try {
				await cloudHelper.callCloudSumbit('admin/enroll_batch_del', { ids }, { title: '删除中' });
				pageHelper.showSuccToast('批量删除成功', 1000);
				await this._reloadAfterBatch();
			} catch (err) {
				console.error(err);
			}
		};
		pageHelper.showConfirm(`确认批量删除选中的 ${ids.length} 个打卡项目？删除后用户记录数据将一并删除且不可恢复`, callback);
	},

	// 批量状态（启用/停用）
	bindBatchStatus: function (e) {
		if (!this._checkSelected()) return;
		let status = Number(pageHelper.dataset(e, 'status'));
		let ids = this.data.selectedIds;
		let statusDesc = status === 1 ? '启用' : '停用';
		let callback = async () => {
			try {
				await cloudHelper.callCloudSumbit('admin/enroll_batch_status', { ids, status }, { title: '处理中' });
				pageHelper.showSuccToast(`批量${statusDesc}成功`, 1000);
				await this._reloadAfterBatch();
			} catch (err) {
				console.error(err);
			}
		};
		pageHelper.showConfirm(`确认批量${statusDesc}选中的 ${ids.length} 个打卡项目？`, callback);
	},

	_getSearchMenu: function () {
		let cateIdOptions = EnrollBiz.getCateList();

		let sortItem1 = [{ label: '分类', type: '', value: 0 }];
		sortItem1 = sortItem1.concat(cateIdOptions);

		let sortItem2 = [
			{ label: '排序', type: '', value: 0 },
			{ label: '按打卡人数', type: 'sort', value: 'ENROLL_JOIN_CNT|desc' },
			{ label: '按开始时间', type: 'sort', value: 'ENROLL_START|desc' },
			{ label: '按结束时间', type: 'sort', value: 'ENROLL_END|desc' },
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
	}

})