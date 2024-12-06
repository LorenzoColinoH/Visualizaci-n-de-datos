import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  // Image,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { colors } from "../assets/colors";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import FilmTrailer from "./FilmTrailer";
import {
  Timestamp,
  addDoc,
  and,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  or,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../config/firebase-config";
import { Octicons } from "@expo/vector-icons";
import { useAuth } from "../AuthProvider";
import { updateProfile } from "firebase/auth";
import BottomSheet from "@gorhom/bottom-sheet";
import { FlatList, TextInput } from "react-native-gesture-handler";
import { Entypo, FontAwesome } from "@expo/vector-icons";
import SaveMovieInList from "../components/SaveMovieInList";
import FilmStatus from "../components/FilmStatus";
import Comentarios from "../components/Comentarios";
import { Easing } from "react-native-reanimated";
import MovieCommentsPreview from "../components/MovieCommentsPreview";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import FriendsThatWatchedMovie from "../components/FriendsThatWatchedMovie";
import Emoji from "react-native-emoji";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import KNN from "ml-knn";

const CountryFlag = ({ isoCode }) => {
  const getFlagEmoji = (isoCode) => {
    // Convierte el código ISO del país en un emoji de bandera
    const codePoints = isoCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt());

    return String.fromCodePoint(...codePoints);
  };

  return (
    <View>
      <Text>Bandera: {getFlagEmoji(isoCode)}</Text>
    </View>
  );
};

const BackArrow = React.memo(() => {
  const navigation = useNavigation();
  const onPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingTop: 20,
        paddingLeft: 20,
        paddingBottom: 15,
        paddingRight: 10,
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        top: 40,
        left: 10,
        zIndex: 999,
      }}
    >
      <Ionicons name="chevron-back-sharp" size={24} color="white" />
    </TouchableOpacity>
  );
});

const ActorCard = React.memo(({ id, name, profile_path, job, character }) => {
  const navigation = useNavigation();
  const handleOnPress = useCallback(() => {
    navigation.push("ActorScreen", { actorID: id });
  }, []);
  return (
    <TouchableOpacity
      style={{ alignItems: "center", marginRight: 20 }}
      onPress={handleOnPress}
      activeOpacity={0.9}
    >
      <Image
        source={{
          uri: `https://image.tmdb.org/t/p/w500${profile_path}`,
        }}
        contentFit="cover"
        style={{ height: 155, width: 100, borderRadius: 8 }}
      />
      <View
        style={{
          backgroundColor: colors.INPUT_COLOR,
          borderRadius: 10,
          top: -14,
          padding: 3,
          paddingVertical: 5,
          borderColor: colors.BACKGROUND_COLOR,
          borderWidth: 4,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 11.5,
            color: "white",
            fontWeight: "600",
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: "lightgray",
            fontWeight: "600",
            maxWidth: 150,
          }}
        >
          {!!job ? job : `(as ${character})`}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

ActorCard.displayName = "ActorCard";

const DirectorCard = React.memo(({ actor, jobOrCharacter }) => {
  const navigation = useNavigation();
  const handleOnPress = useCallback(() => {
    navigation.push("ActorScreen", { actorID: actor.id });
  }, [actor, navigation]);
  return (
    <TouchableOpacity
      style={{
        alignItems: "center",
        marginRight: 20,
        borderRightWidth: 1,
        borderColor: colors.WORDS_COLOR,
        paddingRight: 15,
      }}
      onPress={handleOnPress}
      activeOpacity={0.9}
    >
      <Image
        source={{
          uri: `https://image.tmdb.org/t/p/w500${actor?.profile_path}`,
        }}
        contentFit="cover"
        style={{ height: 155, width: 100, borderRadius: 8 }}
      />
      <View
        style={{
          backgroundColor: colors.INPUT_COLOR,
          borderRadius: 10,
          top: -14,
          padding: 3,
          paddingVertical: 5,
          borderColor: colors.BACKGROUND_COLOR,
          borderWidth: 4,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 11.5,
            color: "white",
            fontWeight: "600",
          }}
        >
          {actor?.name}
        </Text>
        <Text style={{ fontSize: 9, color: "lightgray", fontWeight: "600" }}>
          {`(${actor?.[jobOrCharacter]})`}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

DirectorCard.displayName = "DirectorCard";

const Cast = React.memo(({ id }) => {
  console.log("Cast");
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZWIwNTY0NzcxYjAwYTFiMTE2NjQ5NWQzZWZmYzI3MSIsInN1YiI6IjY1MTNmMDE2Y2FkYjZiMDJiZGViYWMwZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jqZeYyXUptvRW386HRXK0ih7cWHAIF52D90xJ8fb0nY",
    },
  };

  const getCast2 = async () => {
    const request = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/credits?language=en-US`,
      options
    );

    return request.json();
  };

  const filterOnlyActors = useCallback((data) => {
    const castFormated = data?.cast?.filter(
      (actor) => actor.known_for_department === "Acting"
    );
    let castFormated2 = [];
    if (castFormated?.length > 20) {
      castFormated2 = castFormated?.slice(0, 20);
    } else {
      castFormated2 = castFormated?.slice(0, castFormated?.length - 1);
    }
    return castFormated2;
  }, []);

  const { data } = useQuery({
    queryKey: ["cast", id?.toString()],
    queryFn: async () => {
      const data = await getCast2();
      return filterOnlyActors(data);
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  // useEffect(() => {
  //   getCast();
  // }, []);

  return (
    <View style={{ padding: data?.length !== 0 ? 20 : 0 }}>
      {data?.length !== 0 ? (
        <>
          <Text
            style={{
              color: "white",
              fontWeight: "600",
              fontSize: 20,
              marginBottom: 18,
            }}
          >
            Cast
          </Text>
          <View style={{ flex: 1 }}>
            <FlashList
              contentContainerStyle={{ flex: 1 }}
              estimatedItemSize={135}
              horizontal
              keyExtractor={(actor) => actor?.id}
              data={data}
              renderItem={(actor) => (
                <ActorCard
                  id={actor.item.id}
                  name={actor.item.name}
                  profile_path={actor.item.profile_path}
                  job={actor.item.job}
                  character={actor.item.character}
                />
              )}
            />
          </View>
        </>
      ) : null}
    </View>
  );
});

Cast.displayName = "Cast";

const Direction = React.memo(({ id }) => {
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZWIwNTY0NzcxYjAwYTFiMTE2NjQ5NWQzZWZmYzI3MSIsInN1YiI6IjY1MTNmMDE2Y2FkYjZiMDJiZGViYWMwZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jqZeYyXUptvRW386HRXK0ih7cWHAIF52D90xJ8fb0nY",
    },
  };

  const getCast2 = async () => {
    const request = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/credits?language=en-US`,
      options
    );

    return await request.json();
  };

  const { data, isLoading } = useQuery({
    queryKey: ["crew", id?.toString()],
    queryFn: async () => getCast2(),
    staleTime: 5 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  // Ponemos al director el primero
  const director = useMemo(() => {
    return !isLoading && data?.crew?.length > 0
      ? data.crew.filter((crewMember) => crewMember.job === "Director")
      : [];
  }, [isLoading, data]);

  const listWithoutDirector = useMemo(() => {
    return !isLoading && data?.crew?.length > 0
      ? data.crew.filter((crewMember) => crewMember.job !== "Director")
      : [];
  }, [isLoading, data]);

  return (
    <View style={{ padding: data?.length !== 0 ? 20 : 0 }}>
      {data?.length !== 0 ? (
        <>
          <Text
            style={{
              color: "white",
              fontWeight: "600",
              fontSize: 20,
              marginBottom: 18,
            }}
          >
            Crew
          </Text>
          <View style={{ flex: 1 }}>
            <FlashList
              estimatedItemSize={145}
              ListHeaderComponent={() => (
                <DirectorCard actor={director[0]} jobOrCharacter={"job"} />
              )}
              horizontal
              keyExtractor={(actor) => actor?.id + actor?.job}
              data={listWithoutDirector}
              renderItem={(actor) => (
                <ActorCard
                  id={actor.item.id}
                  name={actor.item.name}
                  profile_path={actor.item.profile_path}
                  job={actor.item.job}
                  character={actor.item.character}
                />
              )}
            />
          </View>
        </>
      ) : null}
    </View>
  );
});

Direction.displayName = "Direction";

const MovieTrailer = React.memo(({ title, backdrop_path }) => {
  return (
    <View style={{ width: "100%" }}>
      {/* <FilmTrailer
            title={film?.title}
            id={id}
            isTrailer={true}
            playing2={[true]}
            index={0}
            backdrop_path={`https://image.tmdb.org/t/p/w500${film?.backdrop_path}`}
          /> */}
      {!!title ? (
        <Text
          style={{
            color: "white",
            fontSize: 40,
            fontWeight: "700",
            position: "absolute",
            bottom: 7,
            left: 15,
            zIndex: 999,
          }}
        >
          {title}
        </Text>
      ) : null}
      <Image
        priority="high"
        contentFit="cover"
        source={{
          uri: `https://image.tmdb.org/t/p/w500${
            //!!film?.backdrop_path ? film?.backdrop_path : film?.poster_path
            backdrop_path
          }`,
        }}
        style={{
          width: "100%",
          height: 219,
        }}
      />
    </View>
  );
});

MovieTrailer.displayName = "MovieTrailer";

const Sinopsis = ({ textoCompleto }) => {
  const [mostrarCompleto, setMostrarCompleto] = useState(false);

  const mostrarTexto = () => {
    setMostrarCompleto(!mostrarCompleto);
  };

  return (
    <TouchableOpacity onPress={mostrarTexto} activeOpacity={0.9}>
      <Text
        numberOfLines={mostrarCompleto ? undefined : 2}
        style={{
          fontSize: 15,
          color: "#9ea8c8",
          lineHeight: 23,
          fontWeight: "500",
        }}
      >
        {textoCompleto}
        {!mostrarCompleto && (
          <Text style={{ color: "white" }}>... See more</Text>
        )}
      </Text>
    </TouchableOpacity>
  );
};

const FriendInvite = React.memo(({ friend }) => {
  return (
    <View
      style={{ alignItems: "center", marginBottom: 40, marginHorizontal: 20 }}
    >
      <Image
        source={{
          uri:
            friend.profilePic !== null
              ? friend.profilePic
              : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
        }}
        style={{ borderRadius: 100, padding: 45 }}
      />
      <Text
        style={{
          color: "#5a6278",
          fontSize: 11,
          marginTop: 10,
          fontWeight: "400",
        }}
      >
        {friend.username}
      </Text>
      <View
        style={{
          position: "absolute",
          padding: 3,
          backgroundColor: "#f92d6a",
          bottom: 23,
          right: 5,
          borderRadius: 20,
        }}
      >
        <Entypo name="check" size={19} color="white" />
      </View>
    </View>
  );
});

FriendInvite.displayName = "FriendInvite";

const Friend = React.memo(({ friend, setSelected, selected }) => {
  const [isSelected, setIsSelected] = useState(false);

  const handleChoose = useCallback(() => {
    let isInList = false;
    selected?.forEach((item) => {
      if (item.id === friend.id) {
        isInList = true;
      }
    });
    if (isInList) {
      setSelected(selected.filter((item) => item.id !== friend.id));
      setIsSelected(false);
    } else {
      setSelected((prev) => [...prev, friend]);
      setIsSelected(true);
    }
  }, [selected, friend, setSelected]);

  const initialState = useCallback(() => {
    let isInList = false;
    selected?.forEach((item) => {
      if (item.id === friend.id) {
        isInList = true;
      }
    });
    if (isInList) {
      setIsSelected(true);
    } else {
      setIsSelected(false);
    }
  }, [friend.id, selected]);

  useEffect(() => {
    initialState();
  }, []);

  useEffect(() => {
    if (selected.length === 0) {
      initialState();
    }
  }, [selected]);
  return (
    <TouchableOpacity
      onPress={handleChoose}
      style={{ alignItems: "center", marginBottom: 40, marginHorizontal: 20 }}
    >
      <Image
        source={{
          uri:
            friend.profilePic !== null
              ? friend.profilePic
              : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
        }}
        style={{ borderRadius: 100, padding: 45 }}
      />
      <Text
        style={{
          color: "#5a6278",
          fontSize: 11,
          marginTop: 10,
          fontWeight: "400",
        }}
      >
        {friend.username}
      </Text>
      {isSelected ? (
        <View
          style={{
            position: "absolute",
            padding: 3,
            backgroundColor: "#f92d6a",
            bottom: 23,
            right: 5,
            borderRadius: 20,
          }}
        >
          <Entypo name="check" size={19} color="white" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

Friend.displayName = "Friend";

const SendButton = ({
  film,
  invitation,
  selected,
  id,
  bottomSheetRef,
  setSelected,
  top,
  handleKeyboardClose,
  // handleKeyboardOpen,
  index,
}) => {
  const [inputText, setInputText] = useState("");
  const { profile } = useAuth();

  const handleOnPress = useCallback(async () => {
    if (!invitation.isInvitation) {
      bottomSheetRef.current.snapToIndex(0);
      setSelected([]);
      function acortarString(string) {
        if (string.length > 200) {
          return string.substring(0, 200) + "...";
        }
        return string;
      }

      const notificationsCollectionRef = collection(db, "notifications");
      await addDoc(notificationsCollectionRef, {
        postId: id,
        sender: {
          id: auth.currentUser.uid,
          username: profile?.username,
          profilePic: profile?.profilePic,
        },
        receivers: [...selected.map(({ id }) => id)],
        message: acortarString(inputText),
        notificationDate: Timestamp.fromDate(new Date()),
        notificationType: "Send",
      });
    } else {
      bottomSheetRef.current.snapToIndex(0);
      function acortarString(string) {
        if (string.length > 200) {
          return string.substring(0, 200) + "...";
        }
        return string;
      }

      const notificationsCollectionRef = collection(db, "notifications");
      await addDoc(notificationsCollectionRef, {
        postId: id,
        sender: {
          id: auth.currentUser.uid,
          username: profile?.username,
          profilePic: profile?.profilePic,
        },
        receivers: [invitation.user.id],
        message: acortarString(inputText),
        notificationDate: Timestamp.fromDate(new Date()),
        notificationType: "Send",
      });
    }
  }, [
    id,
    profile?.username,
    profile?.profilePic,
    inputText,
    invitation,
    selected,
    setSelected,
    bottomSheetRef,
  ]);

  const funPhrasesArray = [
    `How about we change the scene tonight with ${film.title}? Just you, me, and the screen.`,
    `Ready to dive into ${film.title} with me? I promise it's better than popcorn!`,
    `Is your evening free? Let’s make ${film.title} our date night flick.`,
    `Fancy a movie thrill? ${film.title} is waiting for us, shall we?`,
    `What's better than watching ${film.title}? Watching it with you. What do you say?`,
  ];

  function getRandomElement(arr) {
    if (arr.length === 0) {
      return null; // Retorna null si el array está vacío
    }
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
  }

  useEffect(() => {
    if (invitation.isInvitation) {
      setInputText(getRandomElement(funPhrasesArray));
    }
  }, [invitation]);
  return (
    <View
      style={{
        width: "100%",
        // position: "absolute",
        // top: index === 2 ? "40%" : "50%",
        // zIndex: 999,
        // alignItems: "center",
        //paddingBottom: 30,
        alignItems: "center",
        backgroundColor: colors.BACKGROUND_COLOR,
        paddingBottom: 20,
      }}
    >
      {selected.length !== 0 || invitation.isInvitation ? (
        <>
          <View
            style={{
              height: 0.5,
              backgroundColor: "gray",
              opacity: 0.3,
              width: "100%",
            }}
          />

          <View
            style={{
              width: "90%",
              justifyContent: "center",
              backgroundColor: colors.BACKGROUND_COLOR,
              paddingVertical: 7,
            }}
          >
            <TextInput
              maxHeight={100}
              textAlignVertical="center"
              numberOfLines={4}
              multiline={true}
              onBlur={handleKeyboardClose}
              placeholderTextColor={"gray"}
              style={{ fontSize: 14.2, color: "white", paddingVertical: 10 }}
              placeholder="Write a message.."
              value={inputText}
              onChangeText={(prev) => {
                setInputText(prev);
              }}
            />
          </View>

          <View
            style={{
              height: 0.5,
              backgroundColor: "gray",
              opacity: 0.3,
              width: "100%",
            }}
          />

          <TouchableOpacity
            onPress={handleOnPress}
            style={{
              marginTop: 14,
              paddingVertical: 11,
              backgroundColor: colors.PINK_COLOR,
              borderRadius: 10,
              alignItems: "center",
              width: "90%",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", fontSize: 15 }}>
              Send
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
};

const Container = ({ id, users, bottomSheetRef, index, invitation, film }) => {
  const [inputText, setInputText] = useState("");
  const [selected, setSelected] = useState([]);
  const [focusOnFriends, setFocusOnFriends] = useState(false);
  // const [top, setTop] = useState(true);

  const handleKeyboardOpen = useCallback(() => {
    setFocusOnFriends(true);
  }, []);

  const handleKeyboardClose = useCallback(() => {
    setFocusOnFriends(false);
  }, []);

  const handleKeyboardClose2 = () => {
    // bottomSheetRef.current.snapToIndex(1);
    setFocusOnFriends(false);
  };
  const fetchUsersFollowing = async ({ pageParam = null, queryKey }) => {
    const usersCollectionRef = collection(db, "users");
    let q;
    if (queryKey[1].trim().length > 0) {
      q = query(
        usersCollectionRef,
        where("followers", "array-contains", auth.currentUser.uid),
        where("username", ">=", queryKey[1].trim().toLowerCase()),
        where("username", "<=", queryKey[1].trim().toLowerCase() + "\uf8ff"),
        orderBy("username"),
        startAfter(pageParam),
        limit(7)
      );
    } else {
      q = query(
        usersCollectionRef,
        where("followers", "array-contains", auth.currentUser.uid),
        orderBy("username"),
        startAfter(pageParam),
        limit(7)
      );
    }
    const snapshot = await getDocs(q);
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    const data = snapshot.docs.map((doc) => {
      return { id: doc?.id, ...doc.data() };
    });
    return { data, nextPage: lastVisible };
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey: [`${auth.currentUser.uid}-following`, inputText],
    queryFn: fetchUsersFollowing,
    getNextPageParam: (lastPage, allPages) => lastPage?.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
    enabled: index !== 1,
  });

  const useros = data?.pages.flatMap((page) => page.data) || [];
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container2}
      keyboardVerticalOffset={Platform.OS === "ios" ? 150 : 0}
    >
      {/* flex: 1 */}
      {/* <View
        style={{ alignItems: "center",justifyContent: "center" }}
      > */}
      {!invitation.isInvitation ? (
        <TextInput
          keyboardAppearance="dark"
          placeholder="Find a friend"
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
          }}
          style={{
            width: "90%",
            backgroundColor: colors.INPUT_COLOR,
            paddingVertical: 13,
            paddingLeft: 10,
            borderRadius: 10,
            color: "#5a6278",
          }}
          onBlur={handleKeyboardClose2}
          onFocus={handleKeyboardOpen}
          placeholderTextColor={"#5a6278"}
        />
      ) : null}
      <FlatList
        // contentContainerStyle={{
        //   justifyContent: "center",
        // }}
        numColumns={3}
        style={{ width: "100%", marginTop: 30 }}
        keyExtractor={(user) => user.id}
        data={!invitation.isInvitation ? useros : [invitation.user]}
        renderItem={(user) =>
          !invitation.isInvitation ? (
            <Friend
              friend={user.item}
              setSelected={setSelected}
              selected={selected}
            />
          ) : (
            <FriendInvite friend={user.item} />
          )
        }
        onScroll={() => Keyboard.dismiss()}
        scrollEventThrottle={16}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={2}
      />
      {/* </View> */}
      {(selected?.length !== 0 && !focusOnFriends) ||
      invitation.isInvitation ? (
        <SendButton
          film={film}
          invitation={invitation}
          handleKeyboardClose={handleKeyboardClose}
          // handleKeyboardOpen={handleKeyboardOpen}
          // top={top}
          setSelected={setSelected}
          selected={selected}
          id={id}
          bottomSheetRef={bottomSheetRef}
          index={index}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
};

const MovieData = React.memo(
  ({
    film,
    openBottomSheet,
    bottomSheetProvidersRef,
    providers,
    id,
    openBottomSheetAddToList,
    isSaved,
    setIsSaved,
    openBottomSheetComments,
    setIsProvidersBottomSheetOpened,
  }) => {
    const openBottomSheetProviders2 = useCallback(() => {
      // Abrir el BottomSheet
      // bottomSheetProvidersRef?.current.snapToIndex(1); // Cambiar el índice según tu necesidad
      setIsProvidersBottomSheetOpened(true);
    });
    console.log("MovieData");
    //console.log(providers.length, "PROVIDERS")
    const getFlagEmoji = useCallback((isoCode) => {
      // Convierte el código ISO del país en un emoji de bandera
      const codePoints = isoCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt());

      return String.fromCodePoint(...codePoints);
    });

    const settingGenresString = useCallback(() => {
      let genresString = "";
      film?.genres?.forEach((genre) => {
        genresString = genresString + " · " + genre.name;
      });
      return genresString;
    });
    return (
      <View style={{ padding: 20 }}>
        {/* <View
        style={{
          width: "100%",
          justifyContent: "center",
          flexDirection: "row",
        }}
      >
        <SeenItButton film={film} />
      </View> */}
        <View style={{ flexDirection: "row", marginBottom: 30 }}>
          <View style={{ flex: 3, alignItems: "flex-start" }}>
            <Text style={{ fontSize: 30, color: "white" }}>{film?.title}</Text>
          </View>
          <SendOrSaveSection
            openBottomSheet={openBottomSheet}
            id={id}
            openBottomSheetComments={openBottomSheetComments}
            openBottomSheetAddToList={openBottomSheetAddToList}
            isSaved={isSaved}
            setIsSaved={setIsSaved}
          />
          {/* ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// */}
        </View>

        {/* IMAGEN PELICULA Y DATOS */}
        <View style={{ flexDirection: "row", marginBottom: 30 }}>
          <Image
            style={{
              height: 193,
              width: 108,
              borderRadius: 12,
              marginRight: 17,
            }}
            source={{
              uri: `https://image.tmdb.org/t/p/w500${film?.poster_path}`,
            }}
          />
          <View
            style={{
              flex: 1,
              justifyContent:
                film?.vote_count !== 0 ? "flex-end" : "flex-start",
            }}
          >
            {film?.vote_count !== 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#9ea8c8",
                  flex: 1,
                  marginTop: 0,
                  marginRight: 15,
                  marginBottom: 11,
                  borderRadius: 5,
                  opacity: 0.5,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: colors.BACKGROUND_MOVIE,
                      fontFamily: "System",
                      fontSize: 56,
                      fontWeight: "800",
                    }}
                  >
                    {film?.vote_average?.toFixed(1)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View
                    style={{
                      borderRadius: 5,
                      backgroundColor: colors.BACKGROUND_MOVIE,
                      paddingVertical: 7,
                      paddingHorizontal: 15,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#9ea8c8", fontSize: 20 }}>
                      {film?.vote_count}
                    </Text>
                    <Text
                      style={{
                        color: "#9ea8c8",
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      {"votes"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
            <View>
              <Text
                style={{
                  color: "#575b70",
                  lineHeight: 22,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {`${film?.release_date.slice(0, 4)} · Movie${
                  film?.runtime !== 0
                    ? ` · ${film?.runtime ? film?.runtime : "loading "}min`
                    : ""
                }${settingGenresString()}`}
              </Text>
            </View>

            {/* <View style = {{width: "100%", alignItems: "center"}}>
            <View style = {{height: 0.2, backgroundColor: colors.WORDS_COLOR, marginTop: 10, width: "100%"}} />    
          </View>     */}

            <View style={{ flexDirection: "row", marginTop: 5 }}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={openBottomSheetProviders2}
              >
                {/* {providers?.["flatrate"]?.length !== 0 ? (
                <Text
                  style={{
                    color: colors.WORDS_COLOR,
                    fontSize: 14,
                    marginTop: 10,
                  }}
                >
                  Providers
                </Text>
              ) : null} */}
                <View
                  style={{
                    flexDirection: "row",
                    padding: 3,
                    flexDirection: "row",
                  }}
                >
                  {providers?.length !== 0
                    ? providers?.map((provider, index) => (
                        <View key={index}>
                          <Image
                            source={{
                              uri: `https://image.tmdb.org/t/p/w500/${provider?.logo_path}`,
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 40,
                              contentFit: "cover",
                              borderWidth: 1,
                              borderColor: colors.WORDS_COLOR,
                              marginRight: -5,
                              zIndex: 999,
                            }}
                          />
                          <View
                            style={{
                              position: "absolute",
                              width: 36,
                              height: 36,
                              borderRadius: 40,
                              backgroundColor: "gray",
                            }}
                          />
                        </View>
                      ))
                    : null}
                  <View
                    style={{
                      flex: 1,
                      alignItems: "flex-end",
                      paddingRight: 5,
                      justifyContent: "center",
                    }}
                  >
                    {!!film ? (
                      <View
                        style={{
                          borderRadius: 2.5,
                          backgroundColor: colors.WORDS_COLOR,
                          paddingHorizontal: 4,
                          paddingVertical: 0,
                        }}
                      >
                        <Text style={{ fontSize: 28 }}>
                          {getFlagEmoji(
                            !!film?.origin_country?.[0]
                              ? film?.origin_country?.[0]
                              : "US"
                          )}
                        </Text>
                      </View>
                    ) : (
                      <></>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              {/* <View style = {{flex: 1}}>
              {providers?.["rent"]?.length !== 0 ? (
                <Text
                  style={{
                    color: colors.WORDS_COLOR,
                    fontSize: 14,
                    marginTop: 10,
                  }}
                >
                  Rent
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", padding: 3 }}>
                {providers?.["rent"]?.slice(0, 3)?.map((provider, index) => (
                  <Image
                    key={index}
                    source={{
                      uri: `https://image.tmdb.org/t/p/w500/${provider.logo_path}`,
                    }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      contentFit: "cover",
                      borderWidth: 1,
                      borderColor: colors.WORDS_COLOR,
                      marginRight: 10,
                    }}
                  />
                ))}
              </View>
            </View> */}
            </View>
          </View>
        </View>

        {!!film?.overview ? (
          <View>
            <Sinopsis textoCompleto={film?.overview} />
          </View>
        ) : null}
      </View>
    );
  }
);

MovieData.displayName = "MovieData";

const SendOrSaveSection = React.memo(
  ({
    openBottomSheet,
    id,
    openBottomSheetAddToList,
    isSaved,
    setIsSaved,
    openBottomSheetComments,
  }) => {
    return (
      <View
        style={{
          flex: 2,
          justifyContent: "flex-end",
          alignItems: "flex-start",
          flexDirection: "row",
        }}
      >
        <TouchableOpacity
          onPress={openBottomSheet}
          style={{
            marginRight: 15,
            padding: 6,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="send" size={26} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openBottomSheetComments}
          style={{
            marginRight: 15,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 3,
          }}
        >
          <FontAwesome name="comment-o" size={29} color="white" />
        </TouchableOpacity>

        <SaveMovie
          id={id}
          openBottomSheetAddToList={openBottomSheetAddToList}
          isSaved={isSaved}
          setIsSaved={setIsSaved}
        />
      </View>
    );
  }
);
SendOrSaveSection.displayName = "SendOrSaveSection";

const SaveMovie = React.memo(
  ({ id, openBottomSheetAddToList, isSaved, setIsSaved }) => {
    // En el perfil de cada usuario tendremos una lista con todas las películas/series que haya guardado, independientemente de la lista en la que
    // lo haya hecho. Para así no tener que cada vez que nos metamos en la página MovieScreen cargar todas las playList de un usuario y comprobar
    // en cada una de ellas si está la película.
    // Cada playList es un read, ya que es un objeto independiente con su collection en firebase
    // Además el profile que tenemos contextualizado con useContext convierte al perfil en una muy buen opcion
    const onPress = useCallback(() => {
      //setIsSaved(true)
      openBottomSheetAddToList();
    });

    const checkIfSavedInAnyList2 = async () => {
      const playListRef = collection(db, "playlists");

      const q = query(
        playListRef,
        and(
          where("films", "array-contains", id),
          or(
            where(`participants.${auth.currentUser.uid}`, "==", "creator"),
            where(`participants.${auth.currentUser.uid}`, "==", "collaborator")
          )
        ),
        limit(7)
      );

      const snapshot = await getCountFromServer(q);
      //console.log(snapshot.data().count !== 0);
      return snapshot.data().count !== 0;
    };

    const { data: isPlayListedInAny, isLoading: isPlayListedInAnyLoading } =
      useQuery({
        queryKey: ["check-film-in-any-playlist", id?.toString()],
        queryFn: async () => await checkIfSavedInAnyList2(),
        staleTime: 5 * 60 * 1000,
        cacheTime: 5 * 60 * 1000,
      });

    // useEffect(() => {
    //   checkIfSavedInAnyList2()
    // }, [])
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          padding: 6,
          alignItems: "center",
          justifyContent: "center",
          //borderRadius: 8,
          //borderColor: "#878fa5",
          //borderWidth: 1,
        }}
      >
        {!isPlayListedInAny ? (
          <FontAwesome name="bookmark-o" size={26} color="white" />
        ) : (
          <FontAwesome name="bookmark" size={26} color="white" />
        )}
      </TouchableOpacity>
    );
  }
);

SaveMovie.displayName = "SaveMovie";

const Movie2 = React.memo(
  ({ id, movie }) => {
    const navigation = useNavigation();

    const handlePress = useCallback(() => {
      navigation.push("MovieScreen", { id, movie });
    });

    return (
      <TouchableOpacity onPress={handlePress}>
        <Image
          style={{ height: 140, width: 90, borderRadius: 8, marginRight: 20 }}
          source={{
            uri: `https://image.tmdb.org/t/p/w500${movie?.poster_path}`,
          }}
        />
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.movie.id === nextProps.movie.id;
  }
);

Movie2.displayName = "Movie2";

const SimilarMovies = React.memo(({ id }) => {
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZWIwNTY0NzcxYjAwYTFiMTE2NjQ5NWQzZWZmYzI3MSIsInN1YiI6IjY1MTNmMDE2Y2FkYjZiMDJiZGViYWMwZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jqZeYyXUptvRW386HRXK0ih7cWHAIF52D90xJ8fb0nY",
    },
  };

  const filterMovies = useCallback((data) => {
    const films_under_500_votes = [];
    const films_over_500_votes = data.results.filter((item) => {
      {
        if (item.vote_count > 500) {
          return true;
        } else {
          films_under_500_votes.push(item);
          return false;
        }
      }
    });
    const allSimilarFilms = [
      ...films_over_500_votes.sort((a, b) => a.vote_average - b.vote_average),
      ...films_under_500_votes,
    ];
    allSimilarFilms.forEach((item) => {});
    if (allSimilarFilms?.length > 15) {
      return allSimilarFilms.splice(0, 15);
    } else {
      return allSimilarFilms.splice(0, allSimilarFilms?.length);
    }
  }, []);

  const getSimilarMovies2 = useCallback(async (id) => {
    const request = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/similar?language=en-US&page=1`,
      options
    );
    return request.json();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["similar-titles", id?.toString()],
    queryFn: async () => {
      const similarMovies = await getSimilarMovies2(id);
      return filterMovies(similarMovies);
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  return (
    <View style={{ padding: 20 }}>
      {data?.length !== 0 || !isLoading ? (
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "white",
              fontWeight: "600",
              fontSize: 20,
              marginBottom: 18,
            }}
          >
            Similar titles
          </Text>

          <View style={{ flex: 1 }}>
            <FlashList
              estimatedItemSize={109}
              initialNumToRender={4}
              maxToRenderPerBatch={1}
              horizontal
              keyExtractor={(movie) => movie?.id}
              data={data}
              renderItem={(movie) => (
                <Movie2 movie={movie?.item} id={movie?.item?.id} />
              )}
            />
          </View>
        </View>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
});

SimilarMovies.displayName = "SimilarMovies";

const SeenItButton = ({ film }) => {
  const { profile, updateProfile } = useAuth();

  const containsMovieWithId = useCallback((ido) => {
    return profile.watched.includes(ido);
  });

  const [isSeen, setIsSeen] = useState(false);

  const deleteMovieWithId = useCallback((id) => {
    const newFilms = profile.watched.filter((movie) => movie !== id);
    return newFilms;
  });

  const handleOnPress = useCallback(async () => {
    const userCollectionRef = collection(db, users);
    const userRef = doc(db, userCollectionRef, auth.currentUser.uid);
    if (!containsMovieWithId(film?.id)) {
      setIsSeen(true);
      const newFilms = profile.watched;
      newFilms.unshift(
        film?.id
        //uri: `https://image.tmdb.org/t/p/w500${film?.poster_path}`,
        //whatchedOn: new Date(),
      );
      await updateDoc(userRef, {
        watched: [...newFilms],
      });
    } else {
      setIsSeen(false);
      const newFilms = deleteMovieWithId(film?.id);
      await updateDoc(userRef, {
        watched: [...newFilms],
      });
    }
    await updateProfile();
  });

  const checkIfSeen = useCallback(() => {
    setIsSeen(containsMovieWithId(film?.id));
  });

  useEffect(() => {
    checkIfSeen();
  }, [film]);
  //<TouchableOpacity
  //onPress={openBottomSheet}
  //          style={{
  //            marginRight: 10,
  //            padding: 5,
  //            alignItems: "center",
  //            justifyContent: "center",
  //            borderRadius: 8,
  //            borderColor: "#878fa5",
  //            borderWidth: 1,
  //          }}
  return (
    <TouchableOpacity
      onPress={handleOnPress}
      style={{
        marginRight: 15,
        padding: 5,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        borderColor: "#878fa5",
        borderWidth: 1,
      }}
    >
      {isSeen ? (
        <Entypo name="check" size={24} color="#878fa5" />
      ) : (
        <Octicons name="eye" size={24} color="#878fa5" />
      )}
    </TouchableOpacity>
  );
};

const Interaciones = ({ film }) => {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "red",
        justifyContent: "center",
      }}
    >
      <SeenItButton film={film} />
    </View>
  );
};

const SectionButton = ({ setSelected, name, selected }) => {
  const onPress = useCallback(() => {
    setSelected((sections) => {
      return sections.map((section) => {
        if (section.name !== name) {
          return { ...section, isSelected: false };
        } else {
          return { ...section, isSelected: true };
        }
      });
    });
  });
  const isSelected = useCallback(() => {
    let isSelected = false;
    selected.forEach((section) => {
      if (section.name === name) {
        isSelected = section.isSelected;
      }
    });
    return isSelected;
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 6,
        backgroundColor: "#dae1f7",
        borderWidth: 1.3,
        borderColor: isSelected() ? "#63697a" : colors.BACKGROUND_MOVIE,
        borderRadius: 15,
        marginHorizontal: 5,
        paddingHorizontal: 17,
      }}
    >
      <Text style={{ color: "#878fa5", fontSize: 16, fontWeight: "500" }}>
        {name}
      </Text>
    </TouchableOpacity>
  );
};

const SectionsRow = () => {
  const [selected, setSelected] = useState([
    { name: "Sinopsis", isSelected: true },
    { name: "Reparto", isSelected: false },
    { name: "Similar titles", isSelected: false },
  ]);
  return (
    <View
      style={{
        paddingHorizontal: 25,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 15,
        flexDirection: "row",
      }}
    >
      <SectionButton
        name={"Sinopsis"}
        setSelected={setSelected}
        selected={selected}
      />
      <SectionButton
        name={"Similar titles"}
        setSelected={setSelected}
        selected={selected}
      />
      <SectionButton
        name={"Reparto"}
        setSelected={setSelected}
        selected={selected}
      />
    </View>
  );
};

const WatchTogether = ({ playlistID, bottomSheetRef, setInvitation }) => {
  const getUserData = async (userID) => {
    return getDoc(doc(collectionUsersRef, userID));
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", playlistID],
    queryFn: async () => (await getUserData(user)).data(),
    staleTime: 5 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  const onInvite = () => {
    setInvitation({ isInvitation: true, user: user });
    bottomSheetRef.current.snapToIndex(1);
  };

  return (
    <View style={{ width: "100%", alignItems: "center", marginVertical: 15 }}>
      {!isLoading ? (
        <View
          style={{
            width: "90%",
            paddingVertical: 10,
            borderRadius: 10,
            borderColor: colors.WORDS_COLOR,
            borderWidth: 2,
            justifyContent: "center",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ justifyContent: "flex-start" }}>
            <Image
              source={{ uri: user?.profilePic }}
              style={{
                width: 35,
                height: 35,
                borderRadius: 35,
                marginHorizontal: 10,
              }}
            />
          </View>
          <Text
            style={{ color: "white", flex: 1, fontWeight: "500", fontSize: 14 }}
          >{`¡${user.username} también tiene la peli en su watchlist, invítale a verla contigo!`}</Text>
          <TouchableOpacity
            onPress={onInvite}
            style={{
              borderColor: "white",
              borderWidth: 0.3,
              marginHorizontal: 10,
              paddingVertical: 4,
              paddingHorizontal: 4,
              borderRadius: 5,
              backgroundColor: colors.PINK_COLOR,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", fontSize: 12 }}>
              Invitar
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

function reorganizeProviders(firstList, secondList) {
  // Crear un conjunto de provider_ids de la segunda lista para búsqueda rápida
  const secondListIds = new Set(secondList.map((item) => item.provider_id));

  // Filtrar los elementos de la primera lista que tienen un provider_id en la segunda lista
  const matchingProviders = firstList.filter((item) =>
    secondListIds.has(item.provider_id)
  );

  // Filtrar los elementos de la primera lista que NO están en la segunda lista
  const otherProviders = firstList.filter(
    (item) => !secondListIds.has(item.provider_id)
  );

  // Concatenar los dos arrays, primero los que coinciden, luego el resto
  return [...matchingProviders, ...otherProviders];
}

const Providers = React.memo(({ providersData }) => {
  const { profile } = useAuth();

  const data = () => {
    let data = [];
    // console.log(providersData?.allProviders?.["flatrate"]?.length)
    // console.log(providersData?.allProviders?.["rent"]?.length)
    // console.log(providersData?.allProviders?.["buy"]?.length)
    if (!!providersData?.allProviders?.["flatrate"]) {
      data = [
        ...reorganizeProviders(
          providersData?.allProviders?.["flatrate"],
          profile.providers
        )?.map((provider) => {
          return { ...provider, type: "Subscription" };
        }),
      ];
    }
    if (!!providersData?.allProviders?.["rent"]) {
      data = [
        ...data,
        ...providersData?.allProviders?.["rent"]?.map((provider) => {
          return { ...provider, type: "Rent" };
        }),
      ];
    }
    if (!!providersData?.allProviders?.["buy"]) {
      data = [
        ...data,
        ...providersData?.allProviders?.["buy"]?.map((provider) => {
          return { ...provider, type: "Buy" };
        }),
      ];
    }
    return data;
  };
  return (
    <View style={{ flex: 1, padding: 25 }}>
      <FlashList
        estimatedItemSize={115}
        keyExtractor={(provider) => `${provider?.provider_id}${provider?.type}`}
        data={!!providersData ? data() : []}
        renderItem={(provider) => (
          <Provider
            path={provider?.item?.logo_path}
            type={provider?.item?.type}
            name={provider?.item?.provider_name}
          />
        )}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ paddingVertical: 80 }} />}
      />
    </View>
  );
});

const Provider = React.memo(({ path, type, name }) => {
  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: "#242b3d",
        width: "100%",
        height: 100,
        borderRadius: 10,
        marginBottom: 20,
        alignItems: "center",
        justifyContent: "flex-start",
        flexDirection: "row",
        backgroundColor: "#242b3d",
        paddingLeft: 25,
        paddingVertical: 0,
      }}
    >
      <View
        style={{
          position: "absolute",
          backgroundColor:
            type === "Rent"
              ? "#5e44ff"
              : type === "Buy"
              ? "#c42575"
              : "#6fb837",
          borderTopRightRadius: 10,
          top: 0,
          right: 0,
          paddingLeft: 8,
          paddingBottom: 4,
          paddingTop: 3,
          paddingRight: 3,
          borderBottomLeftRadius: 10,
        }}
      >
        <Text style={{ color: "white", fontSize: 15, fontWeight: "600" }}>
          {type}
        </Text>
      </View>
      <Image
        style={{ height: 53, width: 53, borderRadius: 53 }}
        source={{ uri: `https://image.tmdb.org/t/p/w500${path}` }}
      />
      <Text
        style={{
          color: "white",
          fontSize: 23,
          fontWeight: "600",
          paddingLeft: 15,
        }}
      >
        {name}
      </Text>
    </View>
  );
});
const MovieScreen = () => {
  const route = useRoute();
  // Habrá que coger toda la información que ya viene en la lista, que tendrá siempre info como el titulo, generos, back_poster, poster
  const { id, movie, bothHaveSameWatchedMovie } = route.params;

  const { profile, country } = useAuth();

  const bottomSheetRef = useRef(null);
  const bottomSheetProvidersRef = useRef(null);
  const bottomSheetAddToListRef = useRef(null);
  const bottomSheetCommentsRef = useRef(null);
  const [selected, setSelected] = useState([]);
  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [followingWhoWhatchedIt, setFollowingWhoWhatchedIt] = useState([]);
  // El flex se estira cogiendo toda la pantalla
  // El View padre por defecto tiene un alignItems: "strecht"

  const checkIfSavedInAnyList = useCallback(() => {
    let isSaved = false;
    profile?.savedContent?.forEach((movie) => {
      if (movie?.filmID?.toString() === id?.toString()) {
        isSaved = true;
      }
    });
    return isSaved;
  }, [profile?.savedContent, id]);

  // Lo analiza solo la primera vez
  const [isSaved, setIsSaved] = useState(checkIfSavedInAnyList);

  // const checkFollowersWhoHaveWhatchedIt = useCallback(async () => {
  //   for (const ref of profile?.following) {
  //     const userRef = doc(db, "users", ref);
  //     const userData = (await getDoc(userRef)).data();
  //     const userWhatchedFilms = userData.watched;
  //     let isFilmWhatchedByThisUser = false;
  //     userWhatchedFilms.forEach((movie) => {
  //       if (movie === id) {
  //         isFilmWhatchedByThisUser = true;
  //       }
  //     });
  //     if (isFilmWhatchedByThisUser) {
  //       setFollowingWhoWhatchedIt((prev) => {
  //         prev.unshift(userData.username);
  //         return prev;
  //       });
  //     }
  //   }
  // });

  const getMovie = useCallback(async () => {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZWIwNTY0NzcxYjAwYTFiMTE2NjQ5NWQzZWZmYzI3MSIsInN1YiI6IjY1MTNmMDE2Y2FkYjZiMDJiZGViYWMwZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jqZeYyXUptvRW386HRXK0ih7cWHAIF52D90xJ8fb0nY",
      },
    };

    const request = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?language=en-US`,
      options
    );

    return request.json();
  });

  const {
    data,
    isFetching,
    isLoading: movieLoading,
  } = useQuery({
    queryKey: ["movie", id?.toString()],
    queryFn: () => getMovie(id?.toString()),
    staleTime: 5 * 60 * 1000, // Cachear por 5 minutos
    cacheTime: 5 * 60 * 1000,
    enabled: loadApp,
  });
  //console.log(isFetching, "ISFETCHING");

  const openBottomSheet = useCallback(() => {
    bottomSheetRef?.current?.snapToIndex(1);
  }, []);

  const openBottomSheetAddToList = useCallback(() => {
    bottomSheetAddToListRef?.current.snapToIndex(1);
  }, []);

  const openBottomSheetComments = useCallback(() => {
    bottomSheetCommentsRef?.current.snapToIndex(1);
  }, []);

  const openBottomSheetProviders = useCallback(() => {
    setIsProvidersBottomSheetOpened(true);
    bottomSheetProvidersRef?.current.snapToIndex(1);
  }, []);

  const closeBottomSheet = useCallback(() => {
    bottomSheetRef.current?.collapse();
    bottomSheetRef.current?.setGestureEnabled(false);
  }, []);

  const handleSheetChanges = useCallback((index) => {
    // Si el índice es 0, el BottomSheet está cerrado
    if (index !== 0) {
      // Ocultar el BottomSheet y deshabilitar la interacción del gesto
      bottomSheetRef?.current?.setGestureEnabled(false);
      bottomSheetRef?.current?.collapse();
    }
  });

  const handleKeyboardShow = useCallback(() => {
    // Mover el BottomSheet al segundo snapPoint cuando el teclado se muestra
    bottomSheetRef?.current?.snapToIndex(2);
  });

  const handleKeyboardHide = useCallback(() => {
    // Restaurar el BottomSheet al primer snapPoint cuando el teclado se oculta
    bottomSheetRef?.current?.snapToIndex(1);
  });

  const handleBottomSheetChange = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const [index, setIndex] = useState(0);

  const [invitation, setInvitation] = useState({
    isInvitation: false,
    user: null,
  });

  const [isProvidersBottomSheetOpened, setIsProvidersBottomSheetOpened] =
    useState(false);

  const handleProviders = useCallback((index) => {
    if (index === 0) {
      setIsProvidersBottomSheetOpened(false);
    }
  }, []);

  // useEffect(() => {
  //   if (isProvidersBottomSheetOpened && bottomSheetProvidersRef.current){
  //     bottomSheetProvidersRef.current.snapToIndex(1);
  //   }
  // }, [isProvidersBottomSheetOpened])

  const handleSendBottomSheetChange = (index) => {
    setIndex(index);
    Keyboard.dismiss();
    if (invitation.isInvitation && index === 0) {
      setInvitation({ isInvitation: false, user: null });
    }
  };

  const getUsers = useCallback(async () => {
    const listaDeUsuarios = [];
    profile?.following?.forEach(async (follower) => {
      const userRefScoped = doc(db, "users", follower);
      const userDataScoped = await getDoc(userRefScoped);
      listaDeUsuarios.push({ ...userDataScoped.data(), id: userDataScoped.id });
    });
    setUsers(listaDeUsuarios);
  }, [profile?.following]);

  const settingProviders = useCallback((providers) => {
    // Si la plataforma que tiene en flatrate la película en cuestión, además la tiene el usuario se pondrá primero para que la pueda ver
    // rápidamente sin tener que desplegar el BottomSheet de providers

    let flatrateProviders = reorganizeProviders(
      providers?.["flatrate"]?.map((provider) => {
        if (provider?.display_priority < 1000) {
          return provider;
        }
      }),
      profile?.providers
    );

    if (flatrateProviders === undefined) {
      flatrateProviders = [];
    }

    if (flatrateProviders?.length > 4) {
      return flatrateProviders.slice(0, 5);
    }

    let rentProviders = providers?.["rent"]?.map((provider) => {
      if (provider?.display_priority < 1000) {
        return provider;
      }
    });

    if (rentProviders === undefined) {
      rentProviders = [];
    }

    if (flatrateProviders?.concat(rentProviders)?.length > 4) {
      return flatrateProviders?.concat(rentProviders).slice(0, 5);
    }

    let buyProviders = providers?.["buy"]?.map((provider) => {
      if (provider?.display_priority < 10000) {
        return provider;
      }
    });

    if (buyProviders === undefined) {
      buyProviders = [];
    }

    return [...flatrateProviders, ...rentProviders, ...buyProviders].slice(
      0,
      5
    );
  });

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZWIwNTY0NzcxYjAwYTFiMTE2NjQ5NWQzZWZmYzI3MSIsInN1YiI6IjY1MTNmMDE2Y2FkYjZiMDJiZGViYWMwZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jqZeYyXUptvRW386HRXK0ih7cWHAIF52D90xJ8fb0nY",
    },
  };

  const getProviders = useCallback(async () => {
    const request = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/watch/providers`,
      options
    );

    if (request.status === 200) {
      const data = await request.json();
      const myProviders = settingProviders(data?.results?.[country]);
      //setAllProviders(data?.results?.[country]);
      setProviders(myProviders);
    }
  });

  const getProviders2 = useCallback(async () => {
    const request = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/watch/providers`,
      options
    );

    return request.json();
  });

  const { data: providersData, isLoading } = useQuery({
    queryKey: ["providers", id?.toString()],
    queryFn: async () => {
      const data = await getProviders2();
      const myProviders = settingProviders(data.results[country]);
      const allProviders = data.results[country];
      return { myProviders, allProviders };
    },
    //staleTime: 5 * 60 * 1000,
    //cacheTime: 5 * 60 * 1000,
    //enabled: loadApp,
  });

  // Comments
  const [number, setNumber] = useState(0);

  const numberOfComments = useCallback(async () => {
    const coll = collection(db, "comments");
    const q = query(coll, where("filmId", "==", id));
    const snapshot = await getCountFromServer(q);
    setNumber(snapshot.data().count);
  });

  //const animationConfigs = useBottomSheetTimingConfigs({
  //  duration: 210,
  //  easing: Easing.linear,
  //});

  useEffect(() => {
    getUsers();
    numberOfComments();
  }, []);

  const [indexList, setIndexList] = useState(0);
  const handleSaveMovieInListBottomSheetChange = useCallback((index) => {
    setIndexList(index);
  }, []);

  const [loadApp, setLoadApp] = useState(false);
  setTimeout(() => {
    setLoadApp(true);
  }, 1000);

  const genreIds = [
    28, 12, 16, 35, 80, 99, 10749, 878, 10751, 14, 36, 27, 10402, 9648, 53,
    10752, 37, 18, 10770,
  ];


  const getMovie2 = useCallback(async (id2) => {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZWIwNTY0NzcxYjAwYTFiMTE2NjQ5NWQzZWZmYzI3MSIsInN1YiI6IjY1MTNmMDE2Y2FkYjZiMDJiZGViYWMwZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jqZeYyXUptvRW386HRXK0ih7cWHAIF52D90xJ8fb0nY",
      },
    };

    const request = await fetch(
      `https://api.themoviedb.org/3/movie/${id2}?language=en-US`,
      options
    );

    return request.json();
  });

  const userWatchedMovies = useQueries({
    queries: (!!profile?.watched ? profile?.watched : [])?.map((movieID) => ({
      queryKey: ["movie", movieID.toString()],
      queryFn: () => getMovie2(movieID.toString()),
      //staleTime: 5 * 60 * 1000,
    })),
  });

  const areMoviesLoading = userWatchedMovies.some((movie) => movie?.isLoading);

  const preprocessMovie = (movie, genresList) => {
    // One-Hot Encoding de géneros
    const genresVector = genresList.map((genre) =>
      movie.genres.map((movie) => movie.id).includes(genre) ? 1 : 0
    );

    // Normalización del presupuesto y popularidad
    const budgetNorm = movie.budget / 500000000; // Supongamos que 200M es el máximo
    const popularityNorm = movie.popularity / 10; // Supongamos que 100 es el máximo

    // Año normalizado

    const year = Number(movie.release_date.slice(0, 4));

    const yearNorm = (year - 1902) / (2024 - 1902); // Rango de años de 1980 a 2024

    return [...genresVector, budgetNorm, yearNorm, popularityNorm];
  };

  const calculateDistance = (movieA, movieB) => {
    // Calcula la distancia euclidiana entre dos vectores
    return Math.sqrt(
      movieA.reduce((sum, value, index) => sum + Math.pow(value - movieB[index], 2), 0)
    );
  };

  const knn = (userMovies, targetMovie, k = 5) => {
    // Preprocesa las películas vistas por el usuario

    const userMoviesProcessed = userMovies.map((movie) => ({
      ...movie,
      features: preprocessMovie(movie, genreIds),
    }));
    
    // userMovies.forEach((movie) => {
    //   console.log(movie.title)
    // });

    // userMovies.forEach((movie) => {
    //   console.log(preprocessMovie(movie, genreIds))
    // });

    // Preprocesa la película objetivo
    const targetFeatures = preprocessMovie(targetMovie, genreIds);

    // console.log(targetFeatures, "targetFeatures")
    // console.log(userMoviesProcessed[4].features, "userMoviesProcessed")
    // Calcula la distancia entre la película objetivo y cada película vista
    const distances = userMoviesProcessed.map((movie) => ({
      movie,
      distance: calculateDistance(movie.features, targetFeatures),
    }));
  
    
    // Ordena las películas por distancia (menor a mayor)
    distances.sort((a, b) => a.distance - b.distance);
    // distances.sort((a, b) => a.distance - b.distance).forEach((movie) => {
    //   console.log(movie.distance, movie.movie.title)
    // })
    // Devuelve las k películas más cercanas
    return distances.slice(0, k)
  };


  // const trainKNN = (userMovies, targetMovie, k = 5) => {
  //   // Preprocesa las películas vistas
  //   const features = userMovies.map((movie) =>
  //     preprocessMovie(movie, genreIds)
  //   );
  //   const labels = userMovies.map(() => 1); // Todas las películas vistas son positivas

  //   // Crea el modelo KNN
  //   const knn = new KNN(features, labels, { k });

  //   // Preprocesa la película objetivo
    
  //   const targetFeatures = preprocessMovie(targetMovie, genreIds);
    
  //   // Predice si la película objetivo ha sido vista
  //   const distances = features.map((feature, index) => {
  //     const distance = Math.sqrt(
  //       feature.reduce(
  //         (sum, value, i) => sum + Math.pow(value - targetFeatures[i], 2),
  //         0
  //       )
  //     );
  //     return { distance, movie: userMovies[index] };
  //   });
  
  //   // Ordena por distancia ascendente
  //   distances.sort((a, b) => a.distance - b.distance);
  
  //   // Devuelve las k películas más cercanas

  //   distances.forEach((movie) => {
  //     console.log(movie.distance, movie.movie.id)
  //   })
  //   return distances.slice(0, k);
  // };
  
  
  const targetMovie = data;


  const userMovies = userWatchedMovies.map(movie => movie.data)
  


  // console.log(userWatchedMovies)
  // userMovies.forEach((movie) => {
  //   console.log(movie.title)
  // });


  const prediction = !movieLoading && !areMoviesLoading ? knn(userMovies, targetMovie, 3) : []

  const prediction2 = prediction?.map((movie) => {
    return movie.movie.vote_average
  })

  const likenes = prediction2.length === 0 ? 0 : ((prediction2.reduce((acc, curr) => acc + curr, 0))/prediction2.length).toFixed(2)

  console.log(likenes, "likenes")
  return (
    // <TouchableWithoutFeedback onPress={closeFilmStatus}>
    <View style={styles.container}>
      <View style={{ marginTop: 45 }} />
      <BackArrow />
      <FlatList
        data={[1]}
        renderItem={(item) => {
          return (
            <View style={{ flex: item.item }}>
              <MovieTrailer
                title={data?.title}
                backdrop_path={data?.backdrop_path}
              />
              <FilmStatus id={id} />
              <MovieData
                id={id}
                providers={providersData?.myProviders}
                film={movieLoading ? movie : data}
                openBottomSheet={openBottomSheet}
                openBottomSheetProviders={openBottomSheetProviders}
                bottomSheetProvidersRef={bottomSheetProvidersRef}
                openBottomSheetAddToList={openBottomSheetAddToList}
                openBottomSheetComments={openBottomSheetComments}
                isSaved={isSaved}
                setIsSaved={setIsSaved}
                setIsProvidersBottomSheetOpened={
                  setIsProvidersBottomSheetOpened
                }
              />

              <View
                style={{
                  paddingVertical: 10,
                  backgroundColor: colors.MODAL_CROSS_COLOR,
                  borderRadius: 5,
                  alignItems: "center",
                  justifyContent: "center",
                  marginHorizontal: 15,
                  flexDirection: "row",
                }}
              >
                <View
                  style={{ paddingLeft: 5, alignItems: "flex-start", flex: 5 }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 16,
                      paddingBottom: 5,
                      fontWeight: "500",
                    }}
                  >
                    Likelihood of Enjoyment
                  </Text>
                  <Text style={{ color: "gray", fontSize: 12 }}>
                    Similarity between the selected movie and those you have
                    previously watched
                  </Text>
                </View>
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 2,
                  }}
                >
                  <View
                    style={{
                      padding: 3,
                      borderRadius: 2,
                      backgroundColor: colors.PINK_COLOR,
                    }}
                  >
                    {likenes !== 0 ? (
                      <Text
                        style={{
                          color: "white",
                          fontSize: 19,
                          fontWeight: "bold",
                        }}
                      >{`${likenes}%`}</Text>
                    ) : (
                      <ActivityIndicator />
                    )}
                  </View>
                </View>
              </View>
              {loadApp ? (
                <>
                  {/* <SectionsRow /> */}
                  {bothHaveSameWatchedMovie &&
                  bothHaveSameWatchedMovie.isWatchedFilms ? (
                    <WatchTogether
                      setInvitation={setInvitation}
                      playlistID={bothHaveSameWatchedMovie.playlistID}
                      bottomSheetRef={bottomSheetRef}
                    />
                  ) : null}
                  <FriendsThatWatchedMovie movieID={id} />

                  <Cast id={id} />
                  <Direction id={id} />
                  {number !== 0 ? (
                    <MovieCommentsPreview
                      number={number}
                      setNumber={setNumber}
                      filmID={id}
                      openBottomSheetComments={openBottomSheetComments}
                    />
                  ) : null}

                  <SimilarMovies id={id} />
                </>
              ) : null}
            </View>
          );
        }}
      />
      {loadApp ? (
        <>
          <BottomSheet
            enableContentPanningGesture={true}
            ref={bottomSheetRef}
            // "60%"
            snapPoints={[0.01, "80%"]}
            index={0}
            style={{
              //backgroundColor: "#0f0f19",
              borderTopLeftRadius: 1000, // Curvatura del borde superior izquierdo
              borderTopRightRadius: 1000,
            }}
            backgroundStyle={{ backgroundColor: colors.BACKGROUND_COLOR }}
            handleIndicatorStyle={{ backgroundColor: "#5a6278" }}
            onChange={handleSendBottomSheetChange}
          >
            <Container
              film={movieLoading ? movie : data}
              invitation={invitation}
              id={id}
              users={users}
              bottomSheetRef={bottomSheetRef}
              handleKeyboardShow={handleKeyboardShow}
              handleKeyboardHide={handleKeyboardHide}
              index={index}
            />
          </BottomSheet>
          <BottomSheet
            enableContentPanningGesture={true}
            ref={bottomSheetProvidersRef}
            snapPoints={[0.01, "50%", "80%"]}
            index={isProvidersBottomSheetOpened ? 1 : -1}
            style={{
              backgroundColor: "#0f0f19",
              borderTopLeftRadius: 1000, // Curvatura del borde superior izquierdo
              borderTopRightRadius: 1000,
            }}
            backgroundStyle={{ backgroundColor: "#0f0f19" }}
            handleIndicatorStyle={{ backgroundColor: "#5a6278" }}
            onChange={handleProviders}
          >
            <Providers providersData={providersData} />
          </BottomSheet>

          <BottomSheet
            enablePanDownToClose={true}
            enableContentPanningGesture={true}
            ref={bottomSheetAddToListRef}
            snapPoints={[0.01, "80%"]}
            index={0}
            backgroundStyle={{ backgroundColor: colors.BACKGROUND_COLOR }}
            handleIndicatorStyle={{ backgroundColor: "#5a6278" }}
            // Estilos para curvar los bordes superiores
            style={{
              backgroundColor: "#0f0f19",
              borderTopLeftRadius: 1000, // Curvatura del borde superior izquierdo
              borderTopRightRadius: 1000,
            }}
            // containerStyle={{
            //   borderTopLeftRadius: 10, // Curvatura del borde superior izquierdo
            //   borderTopRightRadius: 40,
            // }}
            handleComponent={null}
            onChange={handleSaveMovieInListBottomSheetChange}
          >
            <SaveMovieInList
              bottomSheetAddToListRef={bottomSheetAddToListRef}
              isSaved={isSaved}
              setIsSaved={setIsSaved}
              film={movieLoading ? movie : data}
              indexList={indexList}
            />
          </BottomSheet>

          <BottomSheet
            enablePanDownToClose={true}
            containerStyle={{ borderRadius: 16 }}
            enableContentPanningGesture={true}
            ref={bottomSheetCommentsRef}
            snapPoints={[0.01, "80%"]}
            index={0}
            style={{
              // Estilos para curvar los bordes superiores
              backgroundColor: colors.BACKGROUND_COLOR,
              borderTopLeftRadius: 1000, // Curvatura del borde superior izquierdo
              borderTopRightRadius: 1000, // Curvatura del borde superior derecho
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            backgroundStyle={{ backgroundColor: colors.BACKGROUND_MOVIE }}
            handleIndicatorStyle={{ backgroundColor: "#5a6278", width: 40 }}
            onChange={handleBottomSheetChange}
            handleStyle={{ color: "red" }}
            //animationConfigs={animationConfigs}
          >
            <Comentarios
              number={number}
              setNumber={setNumber}
              film={movieLoading ? movie : data}
            />
          </BottomSheet>
        </>
      ) : null}
    </View>
    // </TouchableWithoutFeedback>
  );
};
// Es para enseñar los providers a de la película en cuestion

export default MovieScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_COLOR,
  },
  container2: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_COLOR,
    alignItems: "center",
  },
});
