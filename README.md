# @zondax/ledger-ironfish

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/%40zondax%2Fledger-ironfish.svg)](https://badge.fury.io/js/%40zondax%2Fledger-ironfish)

This package provides a basic client library to communicate with the Ironfish App running in a Ledger Nano S/X

We recommend using the npmjs package in order to receive updates/fixes.

Use `yarn install` to avoid issues.

# Available commands

| Operation    | Response                                 | Command                       |
|--------------|------------------------------------------|-------------------------------|
| getVersion   | app version                              | ---------------               |
| appInfo      | name, version, flags, etc                | ---------------               |
| deviceInfo   | fw and mcu version, id, etc              | Only available in dashboard   |
| sign         | signed message                           | path + message                |
| retrieveKeys | address or view key or proof gen key     | path + key type + verify flag |

# Who we are?

We are Zondax, a company pioneering blockchain services. If you want to know more about us, please visit us at [zondax.ch](https://zondax.ch)
