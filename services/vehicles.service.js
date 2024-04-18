const DbMixin = require("../mixins/db.mixin");
const {DataTypes} = require("sequelize");
const {v4} = require("uuid");

const statuses = {
	inUse: "in_use",
	available: "available",
	potentiallyBroken: "potentially_broken",
	broken: "broken",
	lost: "lost",
};

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
					default: statuses.available,
					enum: [
						statuses.broken,
						statuses.lost,
						statuses.inUse,
						statuses.available,
						statuses.potentiallyBroken,
					],
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
					if (vehicle.status !== statuses.available) {
						throw new Error("vehicle is not available");
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
		endRide: {
			params: {
				rideId: "string",
				endAddress: "string",
				status: {
					type: "string",
					optional: true,
					enum: [statuses.broken]
				}
			},
			handler(ctx) {
				return this.db.transaction(async () => {
					const ride = await this.ridesRepository.findByPk(ctx.params.rideId);
					if (!ride) {
						throw new Error("ride not found");
					}
					if (ride.endTime != null) {
						throw new Error("ride already ended");
					}
					const vehicle = await this.vehiclesRepository.findByPk(ride.vehicleId);
					ride.endAddress = ctx.params.endAddress;
					ride.endTime = Date.now();
					ride.revenue = 49; // TODO calculate revenue

					if (ctx.params.status === statuses.broken) {
						vehicle.status = statuses.potentiallyBroken;
						await ctx.broker.emit("vehicle.broken", {vehicleId: vehicle.id});
					} else {
						vehicle.status = statuses.available;
					}

					await Promise.all([
						ride.save(),
						vehicle.save(),
					]);
					return ride;
				});
			}
		},
		updateStatus: {
			params: {
				vehicleId: "string",
				status: {
					type: "string",
					enum: [statuses.available, statuses.broken, statuses.lost]
				}
			},
			handler(ctx) {
				return this.db.transaction(async () => {
					const vehicle = await this.vehiclesRepository.findByPk(ctx.params.vehicleId);
					if (!vehicle) {
						throw new Error("vehicle not found");
					}
					const currentRide = await this.ridesRepository.findOne({
						where: {
							vehicleId: vehicle.id,
							endTime: null,
						}
					});
					vehicle.status = ctx.params.status;
					await vehicle.save();
					if (currentRide) { // if unfinished ride exists
						currentRide.endTime = Date.now();
						currentRide.revenue	= 49; // TODO calculate
						await currentRide.save();
					}
					return vehicle;
				});
			}
		}
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
