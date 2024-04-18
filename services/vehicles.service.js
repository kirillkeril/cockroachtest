const DbMixin = require("../mixins/db.mixin");
const {DataTypes} = require("sequelize");
const {v4} = require("uuid");
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
					"type": "string",
					optional: true,
				},
				vehicleId: "string",
				startAddress: {
					"type": "string",
					optional: true,
				},
			},
			handler(ctx) {
				return this.db.transaction(async () => {
					// TODO get and apply a promo code
					const user = await ctx.broker.call("users.getById", {id: ctx.params.userId});
					if (!user) {
						throw new Error("user not found");
					}
					const vehicle = await this.vehiclesRepository.findByPk(ctx.params.vehicleId);
					if (!vehicle) {
						throw new Error("vehicle not found");
					}
					if (vehicle.status === statuses.inUse) {
						throw new Error("vehicle already in use");
					}
					vehicle.status = statuses.inUse;
					await vehicle.save();
					return await this.ridesRepository.create({
						id: v4(),
						city: user.city,
						vehicleCity: vehicle.city || null,
						riderId: user.id,
						vehicleId: vehicle.id,
						start_address: ctx.params.startAddress,
						startTime: Date.now(),
					});
				});
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
		this.ridesRepository = this.db.define("rides", {
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
			vehicleCity: {
				type: DataTypes.STRING,
				allowNull: true,
				field: "vehicle_city",
			},
			riderId: {
				type: DataTypes.STRING,
				allowNull: true,
				field: "rider_id",
			},
			vehicleId: {
				type: DataTypes.STRING,
				allowNull: true,
				field: "vehicle_id",
			},
			startAddress: {
				type: DataTypes.STRING,
				allowNull: true,
				field: "start_address",
			},
			endAddress: {
				type: DataTypes.STRING,
				allowNull: true,
				field: "end_address",
			},
			startTime: {
				type: DataTypes.DATE,
				allowNull: true,
				field: "start_time",
			},
			endTime: {
				type: DataTypes.DATE,
				allowNull: true,
				field: "end_time",
			},
			revenue: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: true,
			}
		}, {timestamps: false});
	}
};

const statuses = {
	inUse: "in_use",
	available: "available",
	broken: "broken",
	lost: "lost",
};
