import {Sequelize} from "sequelize";

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

	},
	methods: {

	},
	created() {
		this.db = new Sequelize(process.env.DATABASE_URL, {
			database: process.env.DATABASE_NAME,
		});
	},
	stopped() {
		this.db.close().then(r => this.broker.logger.info("closed connection to database"));
	}
};
