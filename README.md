# docker-mirakurun-epgstation

Docker上にMirakurun + EPGStationを構築し、地デジ・BS・CS録画環境を提供するリポジトリです。  
Mirakurunはチューナーデバイスと連携し、EPGStationは録画・再生機能を提供します。


チューナーは下記を想定しています。
* PX-Q3U4 (外付け型)
* PX-Q3PE4 (内蔵型)


## インストール

※ Dockerホストには事前にチューナーのドライバのインストールと、ハードウェアエンコードの設定を行います。

```bash
mkdir -p ~/docker/mirakurun-epgstation
cd ~/docker/mirakurun-epgstation
git clone https://github.com/horatjp/docker-mirakurun-epgstation .
```

## 設定方法

### Mirakurun設定

mirakurun/conf/channels.yml および mirakurun/conf/tuners.yml を編集して、チューナーおよびチャンネル設定を行ってください。

#### EPGStation設定

epgstation/config/config.yml を編集して、EPGStationの設定を行ってください。


## 使い方

```bash
docker compose up -d
```

Mirakurun
```
http://[ IPアドレス ]:40772
```

EPGStation
```
http://[ IPアドレス ]:8888
```

## 解説

録画サーバの構築(地デジ・BS・CS録画環境) – Debian Linuxによる自宅サーバ  
https://blog.horat.jp/a/356
