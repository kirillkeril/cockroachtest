const {DataTypes, Sequelize} = require("sequelize");
const {v4} = require("uuid");

module.exports = {
	name: "users",
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
		}
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
	}
	,
	async created() {
		this.db = new Sequelize(process.env.DATABASE_URL, {
			database: process.env.DATABASE_NAME,
			dialect: "postgres",
		});
		try {
			await this.db.authenticate();
			console.log("Connection has been established successfully.");
		} catch (error) {
			console.error("Unable to connect to the database:", error);
			process.exit(1);
		}
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
	stopped() {
		this.db.close().then(r => this.broker.logger.info("closed connection to database"));
	}
}
;
