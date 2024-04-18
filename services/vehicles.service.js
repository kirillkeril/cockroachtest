const DbMixin = require("../mixins/db.mixin");
const {DataTypes} = require("sequelize");
module.exports = {
	name: "vehicles",
	mixins: [DbMixin()],
	actions: {
		getClosest: {
			params: {
				userId: "string",
				limit: {
					type: "number",
					default: 25,
				},
				status: {
					type: "string",
					default: "available",
				}
			},
			async handler(ctx) {
				const user = await ctx.broker.call("users.getById", {id: ctx.params.userId});
				if (!user) {
					throw new Error("user not found");
				}
				const actualCity = user.city;
				if (ctx.params.status !== "all") {
					return this.vehiclesRepository.findAll({
						where: {
							city: actualCity,
							status: ctx.params.status,
						},
						limit: ctx.params.limit,
					});
				}
				return this.vehiclesRepository.findAll({
					where: {
						city: actualCity,
					},
					limit: ctx.params.limit,
				});
			}
		},
		startRide: {
			params: {
				userId: "string",
				promoCode: {
					type: "string",
					required: false,
				},
			}
		},
		// updateStatus: {},
		// endRide: {},
	},
	created() {
		this.vehiclesRepository = this.db.define("vehicle", {
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				allowNull: false,
				primaryKey: true,
			},
			city: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			type: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			owner_id: {
				type: DataTypes.UUID,
				references: "users",
				referencesKey: "id",
				allowNull: true,
			},
			creation_time: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			status: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			current_location: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			ext: {
				type: DataTypes.JSONB,
				allowNull: true,
			},
		}, {timestamps: false});
	}
};
