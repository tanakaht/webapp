import sys
sys.path.append("./packages")
from flask import Flask, render_template, send_file



# app = Flask(__name__)
app = Flask(__name__, static_folder="../client/build/static", template_folder="../client/build")


# <path>のcsvファイルを可視化
@app.route('/<path>')
def hello(path):
    return render_template("index.html")

"""
# <path>のjsonファイルを可視化
@app.route('/<path>')
def vis(path=None):
    return render_template("index.html", path=path)
"""
"""
# jsのtextbox とかで可視化するデータを指定することを考えていたので上の関数で直接jsonを取っていない
@app.route('/data/<path>', methods=['GET'])
def get_json(path):
    try:
        with open('./server/data/' + path, 'r') as f:
            js = json.load(f)
            return jsonify(js)
    except Exception as e:
        print(e.args)
        return ''
"""


@app.route('/data/<path>', methods=['GET'])
def get_csv(path):
    try:
        with open(f'./server/data/{path}/main.csv', 'r') as f:
            return send_file(f'./data/{path}/main.csv')
    except Exception as e:
        print(e.args)
        print(f'./server/data/{path}/main.csv')
        return ''


if __name__ == '__main__':
    app.run()

