FROM amazonlinux:2
LABEL Author "Fred Stoddart <pwed@pwed.me>"

ENV HOME /home/steam
ENV SERVER /home/steam/satisfactory
ENV STEAMCMD /home/steam/steamcmd

RUN yum install -y curl tar shadow-utils libgcc.x86_64 glibc.x86_64 libgcc.i686 glibc.i686 libc6 gzip git python3 watch
RUN useradd steam && mkdir -p $SERVER && mkdir -p $STEAMCMD && chown steam:steam $HOME -R

USER steam

ADD install.txt $STEAMCMD/install.txt
RUN df -h && cd $STEAMCMD && curl -s https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz | tar -vxz && \
    cd $STEAMCMD && ./steamcmd.sh +runscript install.txt
ADD StartServer.sh ${HOME}/StartServer.sh
USER root

ADD entrypoint.sh /root/entrypoint.sh

WORKDIR ${SERVER}

EXPOSE 15777/udp

EXPOSE 15000/udp

EXPOSE 7777/udp

ENTRYPOINT [ "/root/entrypoint.sh" ]
