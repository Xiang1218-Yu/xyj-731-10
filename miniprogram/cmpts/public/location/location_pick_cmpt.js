/**
 * Notes: 位置选择组件 (多媒体打卡)
 * 通过 wx.chooseLocation 选点, 值为 {name,address,latitude,longitude}, 通过 change 事件抛给父组件
 */
const pageHelper = require('../../../helper/page_helper.js');

Component({
	/**
	 * 组件的属性列表
	 */
	properties: {
		location: { // 已选位置 {name,address,latitude,longitude}
			type: Object,
			value: null,
		},
		title: {
			type: String,
			value: '位置',
		},
		must: { // 是否必填
			type: Boolean,
			value: false,
		}
	},

	/**
	 * 组件的初始数据
	 */
	data: {},

	/**
	 * 组件的方法列表
	 */
	methods: {
		// 选择位置
		bindChooseTap: function () {
			let that = this;
			wx.chooseLocation({
				success: function (res) {
					if (!res || !res.name) return;

					let location = {
						name: res.name,
						address: res.address,
						latitude: res.latitude,
						longitude: res.longitude,
					};
					that.setData({ location });
					that.triggerEvent('change', location);
				},
				fail: function (err) {
					// 用户取消或未授权定位
					console.log(err);
				}
			});
		},

		// 在地图上查看已选位置
		bindViewTap: function () {
			let loc = this.data.location;
			if (!loc || !loc.latitude) return;
			wx.openLocation({
				latitude: loc.latitude,
				longitude: loc.longitude,
				name: loc.name,
				address: loc.address,
			});
		},

		// 删除已选位置
		bindDelTap: function () {
			let that = this;
			let callback = function () {
				that.setData({ location: null });
				that.triggerEvent('change', null);
			}
			pageHelper.showConfirm('确定要删除该位置吗？', callback);
		},
	}
})
