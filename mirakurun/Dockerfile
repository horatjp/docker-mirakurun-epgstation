FROM chinachu/mirakurun
ENV DEV="build-essential git libpcsclite-dev libssl-dev libtool pkg-config"

RUN apt update \
    && apt -y install $DEV \
    #
    # recpt1
    && git clone https://github.com/stz2012/recpt1.git \
    && cd recpt1/recpt1 \
    && ./autogen.sh \
    && ./configure \
    && make \
    && make install \
    && cd
