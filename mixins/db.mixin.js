const {Sequelize, DataTypes} = require("sequelize");
module.exports = function () {
	const schema = {
		name: "database-mixin",
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
		},
		stopped() {
			this.db.close().then(() => console.log("closed connection to database"));
		}
	};
	return schema;
};
