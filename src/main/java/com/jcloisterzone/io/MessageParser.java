package com.jcloisterzone.io;

import com.google.gson.*;
import com.jcloisterzone.board.Location;
import com.jcloisterzone.board.Position;
import com.jcloisterzone.board.pointer.BoardPointer;
import com.jcloisterzone.board.pointer.FeaturePointer;
import com.jcloisterzone.board.pointer.MeeplePointer;
import com.jcloisterzone.io.message.Message;
import com.jcloisterzone.io.message.ReplayableMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Type;

public final class MessageParser {

    protected final transient Logger logger = LoggerFactory.getLogger(getClass());

    private final Gson gson;

    public static GsonBuilder createGsonBuilder() {
        GsonBuilder builder = new GsonBuilder().disableHtmlEscaping();

        builder.registerTypeAdapter(Position.class, new PositionSerializer());
        builder.registerTypeAdapter(Position.class, new JsonDeserializer<Position>() {
            @Override
            public Position deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context)
                    throws JsonParseException {
                JsonArray arr = json.getAsJsonArray();
                return new Position(arr.get(0).getAsInt(), arr.get(1).getAsInt());
            }
        });
        builder.registerTypeAdapter(Location.class, new LocationSerializer());
        builder.registerTypeAdapter(Location.class, new JsonDeserializer<Location>() {
            @Override
            public Location deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context)
                    throws JsonParseException {
                return Location.valueOf(json.getAsString());
            }
        });
        builder.registerTypeAdapter(BoardPointer.class, new BoardPointerSerializer());
        builder.registerTypeAdapter(BoardPointer.class, new JsonDeserializer<BoardPointer>() {
            @Override
            public BoardPointer deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context)
                    throws JsonParseException {
                if (json.isJsonArray()) {
                    return context.deserialize(json, Position.class);
                }
                JsonObject obj = json.getAsJsonObject();
                if (obj.has("meepleId")) {
                    return context.deserialize(json, MeeplePointer.class);
                }
                if (obj.has("location")) {
                    return context.deserialize(json, FeaturePointer.class);
                }
                return context.deserialize(json, Position.class);
            }
        });

        JsonSerializer<Message> msgSerializer = new JsonSerializer<Message>() {
            @Override
            public JsonElement serialize(Message src, Type typeOfSrc, JsonSerializationContext context) {
                JsonObject obj = new JsonObject();
                obj.add("type", new JsonPrimitive(src.getClass().getAnnotation(MessageCommand.class).value()));
                obj.add("payload", context.serialize(src));
                return obj;
            }
        };
        JsonDeserializer<Message> msgDeserializer = new JsonDeserializer<Message>() {
            @Override
            public Message deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context)
                    throws JsonParseException {
                try {
                    JsonObject obj = (JsonObject) json;
                    Class<? extends Message> cls = CommandRegistry.TYPES.get(obj.get("type").getAsString()).get();
                    return context.deserialize(obj.get("payload"), cls);
                } catch (RuntimeException e) {
                    System.err.println(json);
                    System.err.println(e);
                    throw e;
                }
            }
        };

        builder.registerTypeAdapter(Message.class, msgSerializer);
        builder.registerTypeAdapter(Message.class, msgDeserializer);
        builder.registerTypeAdapter(ReplayableMessage.class, msgSerializer);
        builder.registerTypeAdapter(ReplayableMessage.class, msgDeserializer);

        return builder.setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    }

    public MessageParser() {
        gson = createGsonBuilder().create();
    }

    protected String getCmdName(Class<? extends Message> msgType) {
        return msgType.getAnnotation(MessageCommand.class).value();
    }

    public Message fromJson(String src) {
        return gson.fromJson(src, Message.class);
    }

    public String toJson(Message arg) {
        return gson.toJson(arg, Message.class);
    }

    public Gson getGson() {
        return gson;
    }

    public static class PositionSerializer implements JsonSerializer<Position> {
        @Override
        public JsonElement serialize(Position src, Type typeOfSrc, JsonSerializationContext context) {
            JsonArray arr = new JsonArray(2);
            arr.add(src.x);
            arr.add(src.y);
            return arr;
        }
    }

    public static class LocationSerializer implements JsonSerializer<Location> {
        @Override
        public JsonElement serialize(Location src, Type typeOfSrc, JsonSerializationContext context) {
            return new JsonPrimitive(src.toString());
        }
    }

    public static class BoardPointerSerializer implements JsonSerializer<BoardPointer> {
        @Override
        public JsonElement serialize(BoardPointer src, Type typeOfSrc, JsonSerializationContext context) {
            return context.serialize(src);
        }
    }
}
