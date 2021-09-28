import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import { socket_global } from "../utils/sockets";

const Container = styled.div`
  padding: 20px;
  display: flex;
  width: 90%;
  margin: auto;
  flex-wrap: wrap;
`;

const StyledVideo = styled.video`
  height: 40%;
  width: 50%;
`;

const Video = (props: {
  peer: { on: (arg0: string, arg1: (stream: any) => void) => void };
}) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", (stream: any) => {
      // @ts-ignore
      ref.current.srcObject = stream;
    });
  }, []);

  return <StyledVideo playsInline autoPlay ref={ref} />;
};

const InsideModel = (props: any) => {
  const [peers, setPeers] = useState([]);
  // const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const roomID = "props.match.params.roomID";

  useEffect(() => {
    // socketRef.current = io.connect("/");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // @ts-ignore
        userVideo.current.srcObject = stream;
        socket_global.emit("join room", roomID);
        socket_global.on("all users", (users) => {
          const peers = [];
          users.forEach((userID: any) => {
            const peer = createPeer(userID, socket_global.id, stream);
            peersRef.current.push({
              peerID: userID,
              peer,
            });
            peers.push(peer);
          });
          setPeers(peers);
        });

        socket_global.on("user joined", (payload) => {
          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({
            peerID: payload.callerID,
            peer,
          });

          setPeers((users) => [...users, peer]);
        });

        socket_global.on("receiving returned signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          item.peer.signal(payload.signal);
        });
      });
  }, []);

  function createPeer(
    userToSignal: any,
    callerID: string,
    stream: MediaStream
  ) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal: any) => {
      socket_global.emit("sending signal", { userToSignal, callerID, signal });
    });

    return peer;
  }

  function addPeer(incomingSignal: any, callerID: any, stream: MediaStream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal: any) => {
      socket_global.emit("returning signal", { signal, callerID });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  return (
    <Container>
      <StyledVideo muted ref={userVideo} autoPlay playsInline />
      {peers.map((peer, index) => {
        return <Video key={index} peer={peer} />;
      })}
    </Container>
  );
};

export default InsideModel;
