Editable Lists for Meteor
-------------------------

This package provides a widget for rendering the array (of strings) fields of documents as editable lists.

Example app: [http://editable-text-demo.meteor.com](http://editable-text-demo.meteor.com) (the tags on posts are editable lists)

Example app repo: [https://github.com/JackAdams/editable-text-demo](https://github.com/JackAdams/editable-text-demo)

#### Quick Start

	meteor add babrahams:editable-list

You can then drop an editable list widget into any Blaze template as follows:

	{{> editableList collection="posts" field="tags"}}
	
where "posts" is the name of the mongo collection and "tags" is the name of a document field for the `posts` collection (this field is an array of strings).

`collection` and `field` are the only mandatory parameters.

Note: The widget assumes that the data context is that of a single document from the `posts` collection (with _id value included).

You can also set the data context explicitly as follows:

    {{> EditableList context=singlePostDocument collection="posts" field="author"}}

where `singlePostDocument` can be a single post document already set in the current context, or provided by a template helper from the template that the widget was dropped into.

(You can use `document`, `doc`, `object`, `obj`, `data` or `dataContext` instead of `context` - go with whichever you prefer.)

#### Configuration

You can change the global behaviour of the widget by setting certain properties of `EditableList`, which is the only variable that this package exposes.

`EditableList.saveOnFocusout=false` will mean that the `focusout` event will not save text that is being edited (default is `EditableList.saveOnFocusout=true`)

#### Options

There are a number of parameters you can pass to the widget that affect its behaviour:

`class="text-class"` will change the class attribute of the `li` element wrapping the text of a list item that can be edited

`style=dynamicStyle` can be used if you need to have more dynamic control over the style of the editable list elements (use a template helper to give the `dynamicStyle`) e.g.
	
	dynamicStyle : function() {
	  return 'color:' + Session.get('currentColor') + ';';
	} 

`inputClass="input-class"` will change the class attribute of the `input` element once the text is being edited

`inputStyle=dynamicInputStyle` same as above, but for the `input` element used for adding list items

`userCanEdit=userCanEdit` is a way to tell the widget whether the current user can edit the text or only view it (using a template helper) e.g.
	
	userCanEdit : function() {
	  return this.user_id === Meteor.userId();
	}

(Of course, to make this work, you'll have to save your documents with a `user_id` field that has a value equal to Meteor.userId() of the creator.)

`placeholder="New post"` will be the placeholder for the `input` element that allows users to enter new items into the list

`saveOnFocusout=false` will prevent a particular widget instance from saving the text being edited on a `focusout` event (the default is to save the text, which can be changed via `EditableList.saveOnFocusout`)

`trustHTML=true` will make a particular widget instance rendered its text as HTML (default is `false`, which can be changed via `EditableList.trustHTML`)

#### Transactions

There is built-in support for the `babrahams:transactions` package, if you want everything to be undo/redo-able. To enable this:

	meteor add babrahams:transactions

and in your app (in some config file on both client and server), add:

	EditableList.useTransactions = true;

Or if you only want transactions on particular instances of the widget, pass `useTransaction=true` or `useTransaction=false` to override the default that was set via `EditableList.useTransactions`, but this will only work if you also set `EditableList.clientControlsTransactions=true` (by default it is `false`). If you set the `EditableList.useTransactions` value on the server, without changing `EditableList.clientControlsTransactions`, it doesn't matter what you set on the client (or pass from the client), you will always get the behaviour as set on the server.

#### Security

`EditableList.useMethods=false` will mean that all changes to documents are made on the client, so they are subject to the allow and deny rules you've defined for your collections. To control whether certain users can edit text on certain documents/fields, you can overwrite the function `EditableList.userCanEdit` (which has `this` containing all the data given to the widget, including `context` which is the document itself).  e.g. (to only allow users to edit their own documents):

	EditableList.userCanEdit = function() {
	  return this.context.user_id === Meteor.userId();
	}

In this case, it is a good idea to make the `EditableList.userCanEdit` function and your allow and deny functions share the same logic to the greatest degree possible.

Note: the default setting is `EditableList.useMethods=true`, meaning updates are processed server side and bypass your allow and deny rules. If you're happy with this (and you should be), then all you need to do for consistency between client and server permission checks is overwrite the `EditableList.userCanEdit` function in a file that is shared by both client and server.  Note that this function receives the widget data context as `this` and the collection object as the only parameter.

    // e.g. If `type` is the editable field, but you want to limit the number of objects in the collection with any given value of `type` to 10
    EditableList.userCanEdit = function(Collection) {
	  var count = Collection.find({type:this.context.type}).count(); // `this.context` is a document from `Collection`
	  return count < 10;
	}

Warning: if you set `EditableList.useMethods=false`, your data updates are being done on the client and you don't get html sanitization by default -- you'll have to sort this out or yourself via collection hooks or something. By default (i.e. when `EditableList.useMethods=true`) all data going into the database is passed through [htmlSantizer](https://github.com/punkave/sanitize-html).

Bigger warning: it doesn't really matter what you set `EditableList.useMethods` to -- you still need to lock down your collections using appropriate `allow` and `deny` rules. A malicious user can just type `EditableList.useMethods=false` into the browser console and this package will start making client side changes whose persistence are entirely subject to your `allow` and `deny` rules.