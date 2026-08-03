const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const ProductBiz = require('../../../../biz/product_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
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
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		wx.setNavigationBarTitle({
			title: projectSetting.PRODUCT_NAME + '-管理',
		});
		this.setData({
			PRODUCT_NAME: projectSetting.PRODUCT_NAME
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

		let order = this.data.dataList.list[idx].PRODUCT_ORDER;
		let orderDesc = (order == 0) ? '取消置顶' : '置顶';

		let vouch = this.data.dataList.list[idx].PRODUCT_VOUCH;
		let vouchDesc = (vouch == 0) ? '推荐到首页' : '取消首页推荐';

		let itemList = ['预览', orderDesc, vouchDesc, '生成专属二维码'];

		wx.showActionSheet({
			itemList,
			success: async res => {
				switch (res.tapIndex) {
					case 0: { //预览
						let id = pageHelper.dataset(e, 'id');
						wx.navigateTo({
							url: '../../../product/detail/product_detail?id=' + id,
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
			await cloudHelper.callCloudSumbit('admin/product_sort', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'PRODUCT_ORDER', sort);
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
			await cloudHelper.callCloudSumbit('admin/product_vouch', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'PRODUCT_VOUCH', vouch);
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
				await cloudHelper.callCloudSumbit('admin/product_del', params, opts).then(res => {
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
		pageHelper.showConfirm('确认删除？删除不可恢复', callback);

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
			await cloudHelper.callCloudSumbit('admin/product_status', params).then(res => {
				pageHelper.modifyListNode(id, this.data.dataList.list, 'PRODUCT_STATUS', status, '_id');
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
		let cateIdOptions = ProductBiz.getCateList();

		let sortItem1 = [{ label: '分类', type: '', value: 0 }];
		sortItem1 = sortItem1.concat(cateIdOptions);

		let sortItem2 = [
			{ label: '排序', type: '', value: 0 },
			{ label: '推荐指数从高到底', type: 'sort', value: 'PRODUCT_OBJ.star|desc' },
			{ label: '推荐指数从低到高', type: 'sort', value: 'PRODUCT_OBJ.star|asc' },
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
		this.setData({
			batchMode,
			selectedIds: []
		});
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
		this.setData({ selectedIds });
	},

	// 全选/取消全选（当前页）
	bindSelectAllTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let list = (this.data.dataList && this.data.dataList.list) || [];
		let selectedIds = this.data.selectedIds.slice();
		// 当前页是否已全部选中
		let allSelected = list.length > 0 && list.every(item => selectedIds.indexOf(item._id) > -1);
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
		this.setData({ selectedIds });
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
				await cloudHelper.callCloudSumbit('admin/product_batch_status', params, opts).then(res => {
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
				await cloudHelper.callCloudSumbit('admin/product_batch_del', params, opts).then(res => {
					this._afterBatch();
					pageHelper.showSuccToast('批量删除成功');
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认批量删除选中的' + ids.length + '条记录？删除不可恢复', callback);
	},

	// 批量操作后统一处理：退出批量模式并刷新列表
	_afterBatch: function () {
		this.setData({
			batchMode: false,
			selectedIds: []
		});
		// 刷新列表组件
		let listComp = this.selectComponent('#cmpt-comm-list');
		if (listComp) listComp.reload();
	},

})