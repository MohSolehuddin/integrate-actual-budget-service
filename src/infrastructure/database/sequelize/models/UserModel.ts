import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../index';

export class UserModel extends Model {
  public id!: string;
  public username!: string;
  public password!: string;
  public role!: string;
}

UserModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user',
    },
  },
  {
    sequelize,
    tableName: 'users',
  }
);
