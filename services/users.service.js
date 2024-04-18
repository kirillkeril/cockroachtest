const {DataTypes, Sequelize} = require("sequelize");
const DbMixin = require("../mixins/db.mixin");
const {v4} = require("uuid");

module.exports = {
	name: "users",
	mixins: [DbMixin()],
	settings: {
		fields: [
			"id",
			"name",
			"address",
			"city",
			"creditCard",
		],
		entityValidator: {
			"name": "string|min:3",
			"address": "string|min:3",
			"city": "string",
			"creditCard": "string",
		}
	},
	actions: {
		"create": {
			params: {
				name: "string",
				city: "string",
				address: {
					"type": "string",
					"required": false,
				},
				creditCard: {
					"type": "string",
					"required": false,
				},
			},
			async handler(ctx) {
				try {
					const createdUser = await this.createUser(ctx.params);
					if (!createdUser) {
						ctx.broker.logger.error("user can't be created: ", ctx.params);
					}
					return createdUser;
				} catch (e) {
					ctx.broker.logger.error(e);
					throw "user is not created";
				}
			}
		},
		"getById": {
			params: {
				id: "string"
			},
			handler(ctx) {
				return this.userRepository.findByPk(ctx.params.id);
			}
		}
	},
	created() {
		this.userRepository = this.db.define("user", {
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false
			},
			city: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			address: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			creditCard: {
				type: DataTypes.STRING,
				allowNull: true,
				field: "credit_card",
			}
		}, {
			timestamps: false,
		});
	},
	methods: {
		async createUser(user) {
			return this.userRepository.create({
				id: v4(),
				name: user.name,
				city: user.city,
				address: user.address,
				creditCard: user.creditCard,
			});
		}
	},
}
;
