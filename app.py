from flask import Flask, render_template, jsonify
import json

app = Flask(__name__)


# <path>のjsonファイルを可視化
@app.route('/')
def hello():
    return "hello, please enter path of data to visualize"


# <path>のjsonファイルを可視化
@app.route('/<path>')
def vis(path=None):
    return render_template("index.html", path=path)


# jsのtextbox とかで可視化するデータを指定することを考えていたので上の関数で直接jsonを取っていない
@app.route('/data/<path>', methods=['GET'])
def get_json(path):
    try:
        with open('./data/' + path, 'r') as f:
            js = json.load(f)
            return jsonify(js)
    except:
        print(3)
        return ''


if __name__ == '__main__':
    app.run()

