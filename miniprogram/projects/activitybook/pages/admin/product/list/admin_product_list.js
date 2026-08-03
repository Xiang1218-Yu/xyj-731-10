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
		selIds: [], // 已勾选的书单id（_id）
		isSelAll: false, // 是否已全选当前列表
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

		// 列表刷新（含搜索/筛选/分页）后清空勾选状态，避免误操作
		if (this.data.selIds.length) this._setSel([]);
	},

	/** 同步勾选状态到列表数据（selIds为已勾选的书单id数组） */
	_setSel: function (selIds) {
		let dataList = this.data.dataList;
		let list = (dataList && dataList.list) ? dataList.list : [];

		// 是否已全选当前已加载的记录
		let isSelAll = list.length > 0 && selIds.length >= list.length;
		for (let k = 0; k < list.length; k++)
			list[k]._sel = selIds.includes(list[k]._id);

		this.setData({ selIds, isSelAll, dataList });
	},

	/** 勾选/取消勾选单个书单 */
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

	/** 批量删除 */
	bindBatchDelTap: function () {
		if (!AdminBiz.isAdmin(this)) return;
		let ids = this.data.selIds;
		if (!ids.length) return pageHelper.showNoneToast('请先勾选' + this.data.PRODUCT_NAME);

		let that = this;
		let callback = async () => {
			try {
				let params = { ids };
				let opts = { title: '删除中' };
				await cloudHelper.callCloudSumbit('admin/product_batch_del', params, opts).then(res => {
					pageHelper.showSuccToast('删除成功');
					that._reloadList();
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认删除选中的「' + ids.length + '」个' + this.data.PRODUCT_NAME + '？删除不可恢复', callback);
	},

	/** 批量上下架（status：1=上架 0=下架） */
	bindBatchStatusTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;
		let status = Number(pageHelper.dataset(e, 'status'));
		let ids = this.data.selIds;
		if (!ids.length) return pageHelper.showNoneToast('请先勾选' + this.data.PRODUCT_NAME);

		let statusDesc = (status == 1) ? '上架' : '下架';
		let that = this;
		let callback = async () => {
			try {
				let params = { ids, status };
				await cloudHelper.callCloudSumbit('admin/product_batch_status', params).then(res => {
					pageHelper.showSuccToast('操作成功');
					that._reloadList();
				});
			} catch (err) {
				console.log(err);
			}
		}
		pageHelper.showConfirm('确认将选中的「' + ids.length + '」个' + this.data.PRODUCT_NAME + '批量' + statusDesc + '？', callback);
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
	}

})