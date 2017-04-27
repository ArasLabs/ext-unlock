# Ext Unlock
This project provides a function to unlock items with a designated user other than privileged user. You can set specific users for individual item types.

Aras Innovatorにおいて特権ユーザー以外の指定されたユーザーでアンロックを行うことができる機能を提供します。 個々のアイテムタイプに対して特定のユーザーを設定することができます。

## History

This project and the following release notes have been migrated from the old Aras Projects page.

Release | Notes
--------|--------
[v11SP4](https://github.com/ArasLabs/ext-unlock/releases/tag/v11SP4) | Instructions are described in the ReadMe.pdf

#### Supported Aras Versions

Project | Aras
--------|------
[v11SP4](https://github.com/ArasLabs/ext-unlock/releases/tag/v11SP4) | 11.0 SP4

## Installation

#### Important!
**Always back up your code tree and database before applying an import package or code tree patch!**

### Pre-requisites

1. Aras Innovator installed
2. Aras Package Import tool
3. **ExtUnlockfunction** import package

### Install Steps

1. Backup your database and store the BAK file in a safe place.
2. Open up the Aras Package Import tool.
3. Enter your login credentials and click **Login**
  * _Note: You must login as root for the package import to succeed!_
4. Enter the package name in the TargetRelease field.
  * Optional: Enter a description in the Description field.
5. Enter the path to your local `..\ExtUnlock\Import\imports.mf` file in the Manifest File field.
6. Select **jp.co.neo.ExtUnlockfunction** in the Available for Import field.
7. Select Type = **Merge** and Mode = **Thorough Mode**.
8. Click **Import** in the top left corner.
9. Close the Aras Package Import tool.

## Usage

Review the [ReadMe(SetTabColor).pdf](./Documentation/ReadMe-Ext Unlock function.pdf) for information on using the project. {[English translation](./Documentation/ReadMe-Ext Unlock function-English.docx)}

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## Credits

Created by NEOSYSTEM Co., Ltd.
