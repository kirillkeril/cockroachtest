import {DataTypes, Sequelize} from "sequelize";

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
	actions: {},
	methods: {
		createUser(user) {

		}
	},
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
			credit_card: {
				type: DataTypes.STRING,
				allowNull: true,
			}
		});
	},
	stopped() {
		this.db.close().then(r => this.broker.logger.info("closed connection to database"));
	}
};
